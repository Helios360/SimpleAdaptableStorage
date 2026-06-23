/**
 * Migration de l'ancienne base MySQL `SAS` (dump dans migrate/dump.sql) vers
 * la base Postgres de CloudStudent.
 *
 * Ce qui est migré :
 *   Formations        → formation            (mapping de code old→new)
 *   Users (non-admin) → user(role=candidat) + candidat + fichiers (cv/id recto/verso)
 *   Users (admin)     → user(role=cre) + staff_formation
 *   StaffSettings     → staff_formation
 *   Tests             → test
 *   TestAttempts      → test_attempt
 *
 * Mots de passe : NON migrés (l'ancien stockait du bcrypt, better-auth utilise
 * scrypt). On crée le compte via better-auth avec un mot de passe aléatoire
 * jetable ; l'utilisateur définit le sien via « mot de passe oublié ». Aucun
 * email n'est envoyé par ce script.
 *
 * Usage :
 *   bun src/lib/server/db/migrate-sas.ts              # dry-run : parse + rapport, AUCUNE écriture
 *   bun src/lib/server/db/migrate-sas.ts --commit     # exécute la migration (DB + fichiers)
 *
 * Variables d'env (auto-chargées depuis .env par bun) :
 *   DATABASE_URL          requis
 *   BETTER_AUTH_SECRET    requis pour --commit
 *   UPLOADS_DIR           racine de stockage des fichiers (défaut: ./uploads)
 *   DUMP_FILE             chemin du dump (défaut: migrate/dump.sql)
 *   MIGRATE_FILES_DIR     racine des dossiers u_XX (défaut: migrate)
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, isNotNull } from 'drizzle-orm';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { readFile, copyFile, mkdir, stat } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import * as schema from './schema';
import { user, candidat, cv, formation, staffFormation, test, testAttempt } from './schema';

const COMMIT = process.argv.includes('--commit');
const DUMP_FILE = process.env.DUMP_FILE ?? 'migrate/dump.sql';
const MIGRATE_FILES_DIR = process.env.MIGRATE_FILES_DIR ?? 'migrate';
const UPLOAD_ROOT = process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads');

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL est requis');
	process.exit(1);
}

// ─── Parseur de tuples MySQL ─────────────────────────────────────────────────
// Lit `INSERT INTO `Table` VALUES (...),(...);` en gérant les chaînes quotées
// avec échappements antislash (\' \" \\ \n …). Retourne un tableau de lignes,
// chaque ligne étant un tableau de valeurs JS (string | number | null).

type Cell = string | number | null;

const ESC: Record<string, string> = {
	n: '\n',
	t: '\t',
	r: '\r',
	'0': '\0',
	b: '\b',
	Z: '\x1a',
	'\\': '\\',
	"'": "'",
	'"': '"'
};

function bareValue(raw: string): Cell {
	const t = raw.trim();
	if (t === 'NULL') return null;
	if (/^-?\d+$/.test(t)) return Number(t);
	if (/^-?\d*\.\d+$/.test(t)) return Number(t);
	return t;
}

function parseInsert(sql: string, table: string): Cell[][] {
	const marker = `INSERT INTO \`${table}\` VALUES `;
	const start = sql.indexOf(marker);
	if (start < 0) return [];
	let i = start + marker.length;
	const rows: Cell[][] = [];
	let cur: Cell[] | null = null;
	let field = '';
	let quoted = false;
	let inStr = false;
	for (; i < sql.length; i++) {
		const c = sql[i];
		if (inStr) {
			if (c === '\\') {
				const n = sql[i + 1];
				field += n in ESC ? ESC[n] : n;
				i++;
			} else if (c === "'") {
				inStr = false;
			} else {
				field += c;
			}
			continue;
		}
		if (c === "'") {
			inStr = true;
			quoted = true;
			continue;
		}
		if (cur === null) {
			if (c === '(') {
				cur = [];
				field = '';
				quoted = false;
			} else if (c === ';') {
				break;
			}
			continue;
		}
		if (c === ',') {
			cur.push(quoted ? field : bareValue(field));
			field = '';
			quoted = false;
		} else if (c === ')') {
			cur.push(quoted ? field : bareValue(field));
			rows.push(cur);
			cur = null;
			field = '';
			quoted = false;
		} else {
			field += c;
		}
	}
	return rows;
}

function asJsonArray(cell: Cell): string[] {
	if (cell == null || cell === '') return [];
	try {
		const v = JSON.parse(String(cell));
		return Array.isArray(v) ? v.map(String) : [];
	} catch {
		return [];
	}
}

function bool(cell: Cell): boolean {
	return Number(cell) === 1;
}

// ─── Mapping des codes formation old→new ─────────────────────────────────────
// Les codes du nouveau seed diffèrent des anciens ; on traduit pour réutiliser
// les formations déjà présentes plutôt que d'en créer des doublons.
const CODE_TRANSLATE: Record<string, string> = {
	bts_ndrc: 'BTS NDRC',
	tp_ntc: 'TP NTC',
	dev_web_fs: 'DWFS',
	si_cybersec_expert: 'ESI',
	bts_gpme: 'BTS GPME',
	cap_aepe: 'CAP AEPE',
	bts_optique: 'BTS OL'
};

// ─── Colonnes de la table Users (ordre du CREATE TABLE) ──────────────────────
const U = {
	id: 0, name: 1, fname: 2, email: 3, tel: 4, city: 6, lon: 7, lat: 8,
	postal: 9, birth: 10, cv: 11, id_doc: 12, id_doc_verso: 13, titre_valide: 14,
	password: 15, tags: 16, skills: 17, permis: 18, vehicule: 19, mobile: 20,
	created_at: 21, updated_at: 22, consent: 23, consented_at: 24, terms_version: 25,
	status: 26, formation_id: 27, email_verified: 28, is_admin: 34, year: 35
} as const;

const RECHERCHE = new Set(['active', 'recherche', 'entreprise', 'archive']);

async function main() {
	const sql = await readFile(DUMP_FILE, 'utf8');

	const formations = parseInsert(sql, 'Formations'); // [id, code, name]
	const users = parseInsert(sql, 'Users');
	const staff = parseInsert(sql, 'StaffSettings'); // [staff_user_id, formation_id]
	const tests = parseInsert(sql, 'Tests'); // [id, question, answer, type, difficulty]
	const attempts = parseInsert(sql, 'TestAttempts'); // [id, user_id, test_id, response, score, creation]

	const staffIds = new Set(users.filter((u) => bool(u[U.is_admin])).map((u) => Number(u[U.id])));
	const candidatRows = users.filter((u) => !staffIds.has(Number(u[U.id])));
	const creRows = users.filter((u) => staffIds.has(Number(u[U.id])));

	console.log('─── Dump parsé ───');
	console.log(`  Formations     : ${formations.length}`);
	console.log(`  Users          : ${users.length}  (candidats: ${candidatRows.length}, cre: ${creRows.length})`);
	console.log(`  StaffSettings  : ${staff.length}`);
	console.log(`  Tests          : ${tests.length}`);
	console.log(`  TestAttempts   : ${attempts.length}`);
	console.log(`  Mode           : ${COMMIT ? 'COMMIT (écriture)' : 'DRY-RUN (aucune écriture)'}`);
	console.log(`  UPLOAD_ROOT    : ${UPLOAD_ROOT}`);
	console.log('');

	const client = postgres(url!, { max: 1 });
	const db = drizzle(client, { schema });

	const auth = betterAuth({
		database: drizzleAdapter(db, { provider: 'pg', schema }),
		emailAndPassword: { enabled: true, autoSignIn: false, minPasswordLength: 4 },
		user: {
			additionalFields: {
				role: { type: 'string', required: false, defaultValue: 'candidat' },
				avatar: { type: 'string', required: false },
				school: { type: 'string', required: false },
				company: { type: 'string', required: false }
			}
		},
		secret: process.env.BETTER_AUTH_SECRET ?? 'migrate-secret-placeholder'
	});

	const report = {
		formationsCreated: 0,
		usersCreated: 0,
		usersExisting: 0,
		candidatsCreated: 0,
		creCreated: 0,
		staffLinks: 0,
		staffSkippedExisting: 0,
		filesCopied: 0,
		filesMissing: [] as string[],
		existingSkipped: [] as string[],
		cvRowsCreated: 0,
		testsCreated: 0,
		attemptsCreated: 0
	};

	// Anciens IDs déjà présents en base (email collision) → on n'y touche pas.
	const preExisting = new Set<number>();

	// ── Formations : assure l'existence par code (new), construit oldId→newId ──
	const oldFormationToNew: Record<number, number> = {};
	for (const f of formations) {
		const oldId = Number(f[0]);
		const oldCode = String(f[1]);
		const oldName = String(f[2]);
		const newCode = CODE_TRANSLATE[oldCode] ?? oldCode;
		const existing = await db.select().from(formation).where(eq(formation.code, newCode)).limit(1);
		if (existing[0]) {
			oldFormationToNew[oldId] = existing[0].id;
		} else if (COMMIT) {
			const ins = await db.insert(formation).values({ code: newCode, name: oldName }).returning();
			oldFormationToNew[oldId] = ins[0].id;
			report.formationsCreated++;
		} else {
			oldFormationToNew[oldId] = -1; // placeholder en dry-run
			report.formationsCreated++;
		}
	}

	// ── Users (candidat + cre) ──────────────────────────────────────────────
	const oldUserToNew: Record<number, string> = {};

	async function ensureUser(u: Cell[], role: 'candidat' | 'cre'): Promise<string | null> {
		const email = String(u[U.email]).trim();
		const fullName = `${String(u[U.fname]).trim()} ${String(u[U.name]).trim()}`.trim();
		const existing = await db.select().from(user).where(eq(user.email, email)).limit(1);
		if (existing[0]) {
			report.usersExisting++;
			preExisting.add(Number(u[U.id]));
			report.existingSkipped.push(`${email} (déjà role=${existing[0].role}, attendu=${role})`);
			return existing[0].id;
		}
		if (!COMMIT) {
			report.usersCreated++;
			if (role === 'cre') report.creCreated++;
			return null; // pas d'ID réel en dry-run
		}
		// Mot de passe aléatoire jetable — l'utilisateur le réinitialisera.
		const tmpPassword = crypto.randomUUID() + crypto.randomUUID();
		await auth.api.signUpEmail({
			body: { email, password: tmpPassword, name: fullName, role } as never
		});
		const row = await db.select().from(user).where(eq(user.email, email)).limit(1);
		if (!row[0]) throw new Error(`Échec création ${email}`);
		// Restaure rôle + horodatages + email vérifié (utilisateurs réels connus).
		await db
			.update(user)
			.set({
				role,
				emailVerified: true,
				createdAt: new Date(String(u[U.created_at])),
				updatedAt: new Date(String(u[U.updated_at]))
			})
			.where(eq(user.id, row[0].id));
		report.usersCreated++;
		if (role === 'cre') report.creCreated++;
		return row[0].id;
	}

	// Copie cv/id recto/verso depuis migrate/u_XX vers UPLOAD_ROOT/candidat/<id>/
	async function copySlot(rel: Cell, newUserId: string, slot: 'cv' | 'id_recto' | 'id_verso'): Promise<string | null> {
		if (rel == null || rel === '') return null;
		const src = join(MIGRATE_FILES_DIR, String(rel));
		try {
			await stat(src);
		} catch {
			report.filesMissing.push(String(rel));
			return null;
		}
		const ext = extname(String(rel)).replace('.', '').toLowerCase() || 'bin';
		const relPath = `candidat/${newUserId}/${slot}.${ext}`;
		if (COMMIT) {
			const dest = join(UPLOAD_ROOT, relPath);
			await mkdir(dirname(dest), { recursive: true });
			await copyFile(src, dest);
		}
		report.filesCopied++;
		return relPath;
	}

	console.log('Migration des candidats…');
	for (const u of candidatRows) {
		const oldId = Number(u[U.id]);
		const newId = await ensureUser(u, 'candidat');
		if (newId) oldUserToNew[oldId] = newId;

		// Compte préexistant en base → on ne touche pas à son profil/fichiers.
		if (preExisting.has(oldId)) {
			console.log(`  = ${u[U.email]} (compte existant, ignoré)`);
			continue;
		}

		// Déjà un profil candidat ? (idempotence)
		if (newId) {
			const existing = await db.select().from(candidat).where(eq(candidat.userId, newId)).limit(1);
			if (existing[0]) {
				console.log(`  = ${u[U.email]} (candidat déjà présent)`);
				continue;
			}
		}

		const effId = newId ?? 'DRYRUN';
		const cvPath = await copySlot(u[U.cv], effId, 'cv');
		const idDocPath = await copySlot(u[U.id_doc], effId, 'id_recto');
		const idDocVersoPath = await copySlot(u[U.id_doc_verso], effId, 'id_verso');

		const statusRaw = String(u[U.status]);
		const rechercheStatut = (RECHERCHE.has(statusRaw) ? statusRaw : 'recherche') as
			'active' | 'recherche' | 'entreprise' | 'archive';

		if (COMMIT && newId) {
			await db.insert(candidat).values({
				userId: newId,
				lname: String(u[U.name]),
				fname: String(u[U.fname]),
				tel: u[U.tel] == null ? null : String(u[U.tel]),
				birth: u[U.birth] == null ? null : String(u[U.birth]),
				city: u[U.city] == null ? '' : String(u[U.city]),
				postal: u[U.postal] == null ? null : String(u[U.postal]),
				lon: u[U.lon] == null ? null : Number(u[U.lon]),
				lat: u[U.lat] == null ? null : Number(u[U.lat]),
				formationId: oldFormationToNew[Number(u[U.formation_id])] ?? null,
				year: u[U.year] == null ? null : Number(u[U.year]),
				cvPath,
				idDocPath,
				idDocVersoPath,
				tags: asJsonArray(u[U.tags]),
				skills: asJsonArray(u[U.skills]),
				permis: bool(u[U.permis]),
				vehicule: bool(u[U.vehicule]),
				mobile: bool(u[U.mobile]),
				statut: 'valide',
				rechercheStatut,
				consent: bool(u[U.consent]),
				consentedAt: u[U.consented_at] == null ? null : new Date(String(u[U.consented_at])),
				termsVersion: u[U.terms_version] == null ? 1 : Number(u[U.terms_version]),
				createdAt: new Date(String(u[U.created_at])),
				updatedAt: new Date(String(u[U.updated_at]))
			});
			report.candidatsCreated++;
		} else if (!COMMIT) {
			report.candidatsCreated++;
		}
		console.log(`  + ${u[U.email]}`);
	}

	console.log('Migration des CRE (staff)…');
	for (const u of creRows) {
		const oldId = Number(u[U.id]);
		const newId = await ensureUser(u, 'cre');
		if (newId) oldUserToNew[oldId] = newId;
		console.log(`  + ${u[U.email]} (cre)`);
	}

	// ── staff_formation ──────────────────────────────────────────────────────
	console.log('Migration staff_formation…');
	for (const s of staff) {
		const oldUid = Number(s[0]);
		if (preExisting.has(oldUid)) {
			report.staffSkippedExisting++;
			continue;
		}
		const newUserId = oldUserToNew[oldUid];
		const newFid = oldFormationToNew[Number(s[1])];
		if (!newUserId || newFid == null) continue;
		if (COMMIT) {
			await db
				.insert(staffFormation)
				.values({ userId: newUserId, formationId: newFid })
				.onConflictDoNothing();
		}
		report.staffLinks++;
	}

	// ── Backfill table `cv` ────────────────────────────────────────────────────
	// Le CV d'inscription (candidat.cvPath) alimente la section « Documents »,
	// mais la liste « CVs » (et la cvthèque) lit la table `cv`. On crée donc un
	// CV actif par candidat ayant un cvPath et aucune ligne `cv` (idempotent).
	console.log('Backfill table cv…');
	const withCv = await db
		.select({ id: candidat.id, cvPath: candidat.cvPath })
		.from(candidat)
		.where(isNotNull(candidat.cvPath));
	for (const c of withCv) {
		const existing = await db.select({ id: cv.id }).from(cv).where(eq(cv.candidatId, c.id)).limit(1);
		if (existing[0]) continue;
		const ext = (c.cvPath ?? '').split('.').pop()?.toLowerCase() ?? 'pdf';
		const mime = ext === 'pdf' ? 'application/pdf' : 'application/octet-stream';
		let size: number | null = null;
		try {
			size = (await stat(join(UPLOAD_ROOT, c.cvPath!))).size;
		} catch {
			/* fichier absent → size null, on insère quand même la référence */
		}
		if (COMMIT) {
			await db.insert(cv).values({
				candidatId: c.id,
				name: 'CV',
				active: true,
				path: c.cvPath,
				size,
				mime
			});
		}
		report.cvRowsCreated++;
	}

	// ── Tests + TestAttempts ───────────────────────────────────────────────────
	// Seulement si la table test est vide (évite doublons / conflits d'ID).
	const oldTestToNew: Record<number, number> = {};
	const existingTests = await db.select().from(test);
	if (existingTests.length === 0) {
		console.log('Migration des tests…');
		if (COMMIT) {
			const ins = await db
				.insert(test)
				.values(
					tests.map((t) => ({
						question: String(t[1]),
						answer: String(t[2]),
						type: Number(t[3]),
						difficulty: Number(t[4])
					}))
				)
				.returning();
			tests.forEach((t, idx) => (oldTestToNew[Number(t[0])] = ins[idx].id));
		}
		report.testsCreated = tests.length;

		// Attempts : seulement si test_attempt vide.
		const existingAttempts = await db.select().from(testAttempt).limit(1);
		if (existingAttempts.length === 0) {
			console.log('Migration des tentatives de test…');
			if (COMMIT) {
				const rows = attempts
					.map((a) => {
						const uid = oldUserToNew[Number(a[1])];
						const tid = oldTestToNew[Number(a[2])];
						if (!uid || tid == null) return null;
						return {
							userId: uid,
							testId: tid,
							response: a[3] == null ? null : String(a[3]),
							score: a[4] == null ? null : Number(a[4]),
							createdAt: new Date(String(a[5]))
						};
					})
					.filter((r): r is NonNullable<typeof r> => r !== null);
				if (rows.length) await db.insert(testAttempt).values(rows);
				report.attemptsCreated = rows.length;
			} else {
				report.attemptsCreated = attempts.length;
			}
		} else {
			console.log('  test_attempt non vide → tentatives ignorées.');
		}
	} else {
		console.log('  Table test non vide → tests + tentatives ignorés.');
	}

	// ── Rapport ────────────────────────────────────────────────────────────────
	console.log('\n══════════════ RAPPORT ══════════════');
	console.log(`Formations créées      : ${report.formationsCreated}`);
	console.log(`Users créés            : ${report.usersCreated}  (dont cre: ${report.creCreated})`);
	console.log(`Users déjà existants   : ${report.usersExisting}`);
	console.log(`Candidats créés        : ${report.candidatsCreated}`);
	console.log(`Liens staff_formation  : ${report.staffLinks}`);
	console.log(`Fichiers copiés        : ${report.filesCopied}`);
	console.log(`CV (table cv) créés    : ${report.cvRowsCreated}`);
	console.log(`Tests créés            : ${report.testsCreated}`);
	console.log(`Tentatives créées      : ${report.attemptsCreated}`);
	if (report.filesMissing.length) {
		console.log(`Fichiers INTROUVABLES  : ${report.filesMissing.length}`);
		for (const f of report.filesMissing) console.log(`   - ${f}`);
	}
	if (report.existingSkipped.length) {
		console.log(`Comptes existants ignorés : ${report.existingSkipped.length}  (liens staff ignorés: ${report.staffSkippedExisting})`);
		for (const e of report.existingSkipped) console.log(`   - ${e}`);
	}
	console.log('\nNon migré (volontairement) :');
	console.log('  - mots de passe (bcrypt) → reset par email côté utilisateur');
	console.log('  - school / company (absents de l\'ancienne base) → null');
	console.log('  - score / pitch / titre_valide → null / false');
	if (!COMMIT) console.log('\n⚠️  DRY-RUN : relance avec --commit pour écrire.');
	console.log('Terminé.');
	await client.end();
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
