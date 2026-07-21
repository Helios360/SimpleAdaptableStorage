/**
 * Seeds demo data via better-auth (so password hashing matches runtime).
 * Idempotent: re-running won't duplicate users (it skips existing emails).
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import * as schema from './schema';
import {
	user,
	candidat,
	cv,
	offre,
	candidature,
	formation,
	staffFormation,
	competence,
	formationCompetence,
	school
} from './schema';
import { schoolType } from '../../checklist';

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL is required');
	process.exit(1);
}

const client = postgres(url, { max: 1 });
const db = drizzle(client, { schema });

const auth = betterAuth({
	database: drizzleAdapter(db, { provider: 'pg', schema }),
	emailAndPassword: { enabled: true, autoSignIn: false, minPasswordLength: 4 },
	user: {
		additionalFields: {
			role: { type: 'string', required: false, defaultValue: 'candidat' },
			avatar: { type: 'string', required: false },
			schoolId: { type: 'number', required: false },
			company: { type: 'string', required: false }
		}
	},
	secret: process.env.BETTER_AUTH_SECRET ?? 'seed-secret-placeholder'
});

// ─── Formations ─────────────────────────────────────────────────────────────

const FORMATIONS = [
	{ code: 'BTS NDRC', name: 'BTS Négociation et Digitalisation de la Relation Client' },
	{ code: 'TP NTC', name: 'TP Négociateur Technico-Commercial' },
	{ code: 'DWFS', name: 'Développeur Web Full Stack' },
	{ code: 'ESI', name: "Expert en Systèmes d'Information" },
	{ code: 'BTS GPME', name: 'BTS Gestion de la PME' },
	{ code: 'CAP AEPE', name: 'CAP Accompagnant Éducatif Petite Enfance' }
] as const;

console.log('Seeding formations…');
const formationsExisting = await db.select().from(formation);
const formationIdByCode: Record<string, number> = {};
if (formationsExisting.length === 0) {
	const inserted = await db.insert(formation).values([...FORMATIONS]).returning();
	for (const f of inserted) formationIdByCode[f.code] = f.id;
} else {
	for (const f of formationsExisting) formationIdByCode[f.code] = f.id;
}

// ─── Écoles (référentiel) ────────────────────────────────────────────────────

const SCHOOL_NAMES = ['Cloud Campus', 'Skalys', 'IPSSI Paris'];

// Règlement intérieur par école : lien envoyé à l'étudiant lors de la passation.
const REGLEMENT_URLS: Record<string, string> = {
	'Cloud Campus': 'https://docs.google.com/document/d/1e92FE-UOV1TYbHRSadxR1RCNri30-Nxu/edit',
	Skalys:
		'https://docs.google.com/document/d/10b-OVOm42EuRz-KPxTYJ6FC_peeNo3Nz/edit?usp=sharing&ouid=117813654733070312410&rtpof=true&sd=true'
};

console.log('Seeding schools…');
const schoolIdByName: Record<string, number> = {};
for (const s of await db.select().from(school)) schoolIdByName[s.name] = s.id;
const missingSchools = SCHOOL_NAMES.filter((n) => schoolIdByName[n] == null);
if (missingSchools.length) {
	const inserted = await db
		.insert(school)
		.values(
			missingSchools.map((name) => ({
				name,
				type: schoolType(name),
				reglementUrl: REGLEMENT_URLS[name] ?? null
			}))
		)
		.returning();
	for (const s of inserted) schoolIdByName[s.name] = s.id;
}
// Garantit le lien du règlement même sur une base déjà seedée.
for (const [name, url] of Object.entries(REGLEMENT_URLS)) {
	if (schoolIdByName[name] != null) {
		await db.update(school).set({ reglementUrl: url }).where(eq(school.id, schoolIdByName[name]));
	}
}

// ─── Compétences (référentiel) liées aux formations ─────────────────────────

const COMPETENCES_BY_FORMATION: Record<string, string[]> = {
	'BTS NDRC': [
		'Prospection commerciale',
		'Négociation',
		'Relation client',
		'CRM',
		'Communication',
		'Marketing digital'
	],
	'TP NTC': [
		'Prospection commerciale',
		'Négociation',
		'Relation client',
		'Vente B2B',
		'Veille concurrentielle'
	],
	DWFS: ['JavaScript', 'TypeScript', 'React', 'Svelte', 'Node.js', 'SQL', 'HTML/CSS', 'Git'],
	ESI: ['SQL', 'Réseaux', 'Cybersécurité', 'Administration système', 'Cloud', 'Gestion de projet'],
	'BTS GPME': ['Gestion administrative', 'Comptabilité', 'Excel', 'Relation client', 'Communication'],
	'CAP AEPE': [
		'Accompagnement de l’enfant',
		'Soins et hygiène',
		'Animation d’activités',
		'Communication',
		'Sécurité'
	]
};

console.log('Seeding compétences…');
// Référentiel global dédupliqué.
const allCompetenceLabels = [...new Set(Object.values(COMPETENCES_BY_FORMATION).flat())];
const competenceIdByLabel: Record<string, number> = {};
const competencesExisting = await db.select().from(competence);
for (const c of competencesExisting) competenceIdByLabel[c.label] = c.id;

const missingLabels = allCompetenceLabels.filter((l) => competenceIdByLabel[l] == null);
if (missingLabels.length) {
	const insertedCompetences = await db
		.insert(competence)
		.values(missingLabels.map((label) => ({ label })))
		.returning();
	for (const c of insertedCompetences) competenceIdByLabel[c.label] = c.id;
}

// Liaisons formation ↔ compétence (idempotent via onConflictDoNothing).
const links: { formationId: number; competenceId: number }[] = [];
for (const [code, labels] of Object.entries(COMPETENCES_BY_FORMATION)) {
	const fid = formationIdByCode[code];
	if (fid == null) continue;
	for (const label of labels) {
		const cid = competenceIdByLabel[label];
		if (cid != null) links.push({ formationId: fid, competenceId: cid });
	}
}
if (links.length) {
	await db.insert(formationCompetence).values(links).onConflictDoNothing();
}

// ─── Données de démonstration ────────────────────────────────────────────────
// Comptes, candidats, offres et candidatures de DÉMO uniquement.
// En PRODUCTION : ne PAS définir SEED_DEMO → ce bloc est ignoré (seules les
// formations + compétences de référence ci-dessus sont créées).
// En dev : lancer avec `SEED_DEMO=1 bun ./src/lib/server/db/seed.ts`.
if (process.env.SEED_DEMO === '1') {

type SeedAccount = {
	email: string;
	password: string;
	name: string;
	role: 'candidat' | 'cre' | 'recruteur';
	avatar: string;
	school?: string;
	company?: string;
};

const ACCOUNTS: SeedAccount[] = [
	{ email: 'lea@student.fr', password: 'demo', name: 'Léa Martin', role: 'candidat', avatar: 'LM', school: 'IPSSI Paris' },
	{ email: 'thomas@student.fr', password: 'demo', name: 'Thomas Renard', role: 'candidat', avatar: 'TR', school: 'IPSSI Paris' },
	{ email: 'sara@student.fr', password: 'demo', name: 'Sara Benali', role: 'candidat', avatar: 'SB', school: 'IPSSI Paris' },
	{ email: 'hugo@student.fr', password: 'demo', name: 'Hugo Petit', role: 'candidat', avatar: 'HP', school: 'IPSSI Paris' },
	{ email: 'ines@student.fr', password: 'demo', name: 'Inès Caron', role: 'candidat', avatar: 'IC', school: 'IPSSI Paris' },
	{ email: 'elodie@cloudstudent.fr', password: 'demo', name: 'Élodie Garessus', role: 'cre', avatar: 'EG', school: 'IPSSI Paris' },
	{ email: 'marie@orange.fr', password: 'demo', name: 'Marie Dupont', role: 'recruteur', avatar: 'MD', company: 'Orange' }
];

async function ensureUser(a: SeedAccount): Promise<string> {
	const existing = await db.select().from(user).where(eq(user.email, a.email)).limit(1);
	if (existing[0]) return existing[0].id;

	await auth.api.signUpEmail({
		body: {
			email: a.email,
			password: a.password,
			name: a.name,
			role: a.role,
			avatar: a.avatar,
			schoolId: a.school ? schoolIdByName[a.school] : undefined,
			company: a.company
		} as never
	});

	const row = await db.select().from(user).where(eq(user.email, a.email)).limit(1);
	if (!row[0]) throw new Error(`Failed to create ${a.email}`);
	return row[0].id;
}

console.log('Seeding accounts…');
const ids: Record<string, string> = {};
for (const a of ACCOUNTS) {
	ids[a.email] = await ensureUser(a);
	console.log('  ✓', a.email);
}

// ─── Staff formations (CRE) ─────────────────────────────────────────────────

console.log('Seeding staff_formation…');
const creId = ids['elodie@cloudstudent.fr'];
const staffExisting = await db
	.select()
	.from(staffFormation)
	.where(eq(staffFormation.userId, creId));
if (!staffExisting.length) {
	await db.insert(staffFormation).values([
		{ userId: creId, formationId: formationIdByCode['DWFS'] },
		{ userId: creId, formationId: formationIdByCode['ESI'] },
		{ userId: creId, formationId: formationIdByCode['BTS NDRC'] }
	]);
}

// ─── Candidats ──────────────────────────────────────────────────────────────

type StudentSeed = {
	email: string;
	lname: string;
	fname: string;
	tel: string;
	birth: string;
	city: string;
	postal: string;
	lat: number;
	lon: number;
	formationCode: string;
	year: number;
	tags: string[];
	skills: string[];
	permis: boolean;
	vehicule: boolean;
	mobile: boolean;
	score: number | null;
	pitch: boolean;
	statut: 'en_attente' | 'valide' | 'refuse';
	rechercheStatut: 'active' | 'recherche' | 'entreprise' | 'archive';
	cvs: string[];
};

const STUDENT_SEED: StudentSeed[] = [
	{
		email: 'lea@student.fr',
		lname: 'Martin',
		fname: 'Léa',
		tel: '0612345678',
		birth: '2002-04-12',
		city: 'Paris',
		postal: '75001',
		lat: 48.8566,
		lon: 2.3522,
		formationCode: 'DWFS',
		year: 3,
		tags: ['Eloquence', 'Curieux'],
		skills: ['JavaScript', 'React', 'Svelte', 'Anglais'],
		permis: true,
		vehicule: false,
		mobile: true,
		score: null,
		pitch: true,
		statut: 'en_attente',
		rechercheStatut: 'recherche',
		cvs: ['CV Alternance', 'CV Stage']
	},
	{
		email: 'thomas@student.fr',
		lname: 'Renard',
		fname: 'Thomas',
		tel: '0623456789',
		birth: '2000-07-23',
		city: 'Lyon',
		postal: '69002',
		lat: 45.7578,
		lon: 4.832,
		formationCode: 'ESI',
		year: 5,
		tags: ['Déterminé', 'Autonome'],
		skills: ['Python', 'SQL', 'Node.js', 'Anglais'],
		permis: true,
		vehicule: true,
		mobile: true,
		score: 71,
		pitch: false,
		statut: 'en_attente',
		rechercheStatut: 'active',
		cvs: ['CV Alternance']
	},
	{
		email: 'sara@student.fr',
		lname: 'Benali',
		fname: 'Sara',
		tel: '0634567890',
		birth: '2003-11-05',
		city: 'Paris',
		postal: '75015',
		lat: 48.842,
		lon: 2.3043,
		formationCode: 'DWFS',
		year: 2,
		tags: ['Optimiste', 'Curieux'],
		skills: ['Figma', 'Photoshop', 'Communication'],
		permis: false,
		vehicule: false,
		mobile: false,
		score: 90,
		pitch: true,
		statut: 'valide',
		rechercheStatut: 'entreprise',
		cvs: ['CV CDI', 'CV Stage']
	},
	{
		email: 'hugo@student.fr',
		lname: 'Petit',
		fname: 'Hugo',
		tel: '0645678901',
		birth: '2001-02-18',
		city: 'Lille',
		postal: '59000',
		lat: 50.6292,
		lon: 3.0573,
		formationCode: 'BTS GPME',
		year: 2,
		tags: ['Rigoureux'],
		skills: ['Excel', 'Communication', 'Gestion de projet'],
		permis: true,
		vehicule: true,
		mobile: false,
		score: 55,
		pitch: false,
		statut: 'refuse',
		rechercheStatut: 'archive',
		cvs: ['CV Stage']
	},
	{
		email: 'ines@student.fr',
		lname: 'Caron',
		fname: 'Inès',
		tel: '0656789012',
		birth: '1999-09-30',
		city: 'Bordeaux',
		postal: '33000',
		lat: 44.8378,
		lon: -0.5792,
		formationCode: 'ESI',
		year: 5,
		tags: ['Eloquence', 'Déterminé'],
		skills: ['Python', 'SQL', 'Anglais', 'Espagnol'],
		permis: true,
		vehicule: true,
		mobile: true,
		score: 88,
		pitch: true,
		statut: 'valide',
		rechercheStatut: 'recherche',
		cvs: ['CV CDI']
	}
];

console.log('Seeding candidats…');
const candidatIds: Record<string, number> = {};
for (const s of STUDENT_SEED) {
	const userId = ids[s.email];
	const existing = await db.select().from(candidat).where(eq(candidat.userId, userId)).limit(1);
	let row = existing[0];
	if (!row) {
		const inserted = await db
			.insert(candidat)
			.values({
				userId,
				lname: s.lname,
				fname: s.fname,
				tel: s.tel,
				birth: s.birth,
				city: s.city,
				postal: s.postal,
				lat: s.lat,
				lon: s.lon,
				formationId: formationIdByCode[s.formationCode],
				year: s.year,
				tags: s.tags,
				skills: s.skills,
				permis: s.permis,
				vehicule: s.vehicule,
				mobile: s.mobile,
				score: s.score,
				pitch: s.pitch,
				statut: s.statut,
				rechercheStatut: s.rechercheStatut,
				consent: true,
				consentedAt: new Date()
			})
			.returning();
		row = inserted[0];
		for (const name of s.cvs) {
			await db.insert(cv).values({ candidatId: row.id, name });
		}
	}
	candidatIds[s.email] = row.id;
	console.log('  ✓', s.email);
}

// ─── Offres / candidatures ──────────────────────────────────────────────────

const OFFRES_SEED = [
	{ titre: 'Dev React - Stage', entreprise: 'Thales', lieu: 'Paris', type: 'Stage', date: '2026-05-01' },
	{ titre: 'Data Analyst - Alternance', entreprise: 'Orange', lieu: 'Lyon', type: 'Alternance', date: '2026-06-15' },
	{ titre: 'UX Designer - CDI', entreprise: 'BNP', lieu: 'Bordeaux', type: 'CDI', date: '2026-04-20' }
];

console.log('Seeding offres…');
const offresExisting = await db.select().from(offre);
const offresById: Record<string, number> = {};
if (offresExisting.length === 0) {
	const inserted = await db.insert(offre).values(OFFRES_SEED).returning();
	for (const o of inserted) offresById[o.titre] = o.id;
} else {
	for (const o of offresExisting) offresById[o.titre] = o.id;
}

console.log('Seeding candidatures…');
const candidaturesExisting = await db.select().from(candidature);
if (candidaturesExisting.length === 0) {
	const leaId = candidatIds['lea@student.fr'];
	await db.insert(candidature).values([
		{ candidatId: leaId, offreId: offresById['Dev React - Stage'], statut: 'entretien' },
		{ candidatId: leaId, offreId: offresById['Data Analyst - Alternance'], statut: 'envoyee' }
	]);
}

} else {
	console.log('Données de démo ignorées (définir SEED_DEMO=1 pour les créer).');
}

console.log('Done.');
await client.end();
