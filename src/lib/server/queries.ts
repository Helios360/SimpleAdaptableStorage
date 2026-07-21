/**
 * Cross-page query helpers. listCandidats() keeps the simple shape for
 * detail modals; searchCandidats() backs the rich CRE listing (chips,
 * pagination, haversine radius, JSON tags/skills…).
 */
import { and, asc, desc, eq, ilike, inArray, sql, type SQL } from 'drizzle-orm';
import { db } from './db';
import {
	candidat,
	user,
	cv,
	formation,
	staffFormation,
	competence,
	formationCompetence,
	placement,
	promo,
	school
} from './db/schema';
import { geocode } from './geocode';

export interface CvRef {
	id: number;
	name: string;
	size: number | null;
	mime: string | null;
	hasFile: boolean;
}

export interface CandidatRow {
	id: number;
	userId: string;
	name: string; // "LNAME Fname" pour rester compatible avec le composant Detail
	lname: string;
	fname: string;
	email: string;
	tel: string | null;
	birth: string | null;
	age: number | null;
	formation: string;
	formationCode: string | null;
	formationId: number | null;
	year: number | null;
	city: string;
	postal: string | null;
	lat: number | null;
	lon: number | null;
	tags: string[];
	skills: string[];
	permis: boolean;
	vehicule: boolean;
	mobile: boolean;
	score: number | null;
	pitch: boolean;
	statut: string;
	rechercheStatut: string;
	// Placement le plus récent (null si l'étudiant n'a jamais été placé). Sert à
	// l'onglet « Placés » : affichage + édition du statut OPCO directement en liste.
	placementId: number | null;
	statutOpco: string | null;
	createdAt: string;
	cvs: CvRef[];
	hasCvDoc: boolean;
	hasIdRecto: boolean;
	hasIdVerso: boolean;
	// Type réel des pièces d'identité (l'URL d'aperçu est sans extension, donc
	// le client ne peut pas le déduire seul — une pièce peut être pdf OU image).
	idRectoKind: 'pdf' | 'image' | undefined;
	idVersoKind: 'pdf' | 'image' | undefined;
	titreValide: string | null;
	distanceKm?: number;
}

function docKind(path: string | null): 'pdf' | 'image' | undefined {
	if (!path) return undefined;
	const ext = path.split('.').pop()?.toLowerCase() ?? '';
	if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) return 'image';
	if (ext === 'pdf') return 'pdf';
	return undefined;
}

function ageFromBirth(birth: string | null): number | null {
	if (!birth) return null;
	const d = new Date(birth);
	if (Number.isNaN(d.getTime())) return null;
	const now = new Date();
	let age = now.getFullYear() - d.getFullYear();
	const m = now.getMonth() - d.getMonth();
	if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
	return age;
}

function fullName(lname: string, fname: string): string {
	return `${lname.toUpperCase()} ${fname}`.trim();
}

async function attachCvs<T extends { id: number }>(rows: T[]): Promise<Record<number, CvRef[]>> {
	if (!rows.length) return {};
	const ids = rows.map((r) => r.id);
	const cvRows = await db
		.select({
			id: cv.id,
			candidatId: cv.candidatId,
			name: cv.name,
			size: cv.size,
			mime: cv.mime,
			path: cv.path
		})
		.from(cv)
		.where(inArray(cv.candidatId, ids));
	const bucket: Record<number, CvRef[]> = {};
	for (const c of cvRows) {
		(bucket[c.candidatId] ??= []).push({
			id: c.id,
			name: c.name,
			size: c.size,
			mime: c.mime,
			hasFile: !!c.path
		});
	}
	return bucket;
}

const BASE_COLS = {
	id: candidat.id,
	userId: candidat.userId,
	lname: candidat.lname,
	fname: candidat.fname,
	tel: candidat.tel,
	birth: candidat.birth,
	city: candidat.city,
	postal: candidat.postal,
	lat: candidat.lat,
	lon: candidat.lon,
	formationId: candidat.formationId,
	year: candidat.year,
	tags: candidat.tags,
	skills: candidat.skills,
	permis: candidat.permis,
	vehicule: candidat.vehicule,
	mobile: candidat.mobile,
	score: candidat.score,
	pitch: candidat.pitch,
	statut: candidat.statut,
	rechercheStatut: candidat.rechercheStatut,
	// Placement le plus récent, via sous-requêtes corrélées (un candidat peut avoir
	// plusieurs placements ; on retient le dernier créé, cohérent avec la fiche détail).
	placementId: sql<
		number | null
	>`(SELECT p.id FROM ${placement} p WHERE p.candidat_id = ${candidat.id} ORDER BY p.created_at DESC LIMIT 1)`,
	statutOpco: sql<
		string | null
	>`(SELECT p.statut_opco FROM ${placement} p WHERE p.candidat_id = ${candidat.id} ORDER BY p.created_at DESC LIMIT 1)`,
	createdAt: candidat.createdAt,
	cvPath: candidat.cvPath,
	idDocPath: candidat.idDocPath,
	idDocVersoPath: candidat.idDocVersoPath,
	titreValide: candidat.titreValide,
	email: user.email,
	formationCode: formation.code,
	formationName: formation.name
} as const;

type BaseRow = {
	id: number;
	userId: string;
	lname: string;
	fname: string;
	tel: string | null;
	birth: string | null;
	city: string;
	postal: string | null;
	lat: number | null;
	lon: number | null;
	formationId: number | null;
	year: number | null;
	tags: string[];
	skills: string[];
	permis: boolean;
	vehicule: boolean;
	mobile: boolean;
	score: number | null;
	pitch: boolean;
	statut: string;
	rechercheStatut: string;
	placementId: number | null;
	statutOpco: string | null;
	createdAt: Date;
	cvPath: string | null;
	idDocPath: string | null;
	idDocVersoPath: string | null;
	titreValide: string | null;
	email: string;
	formationCode: string | null;
	formationName: string | null;
	distanceKm?: number;
};

function toRow(r: BaseRow, cvs: CvRef[]): CandidatRow {
	return {
		id: r.id,
		userId: r.userId,
		name: fullName(r.lname, r.fname),
		lname: r.lname,
		fname: r.fname,
		email: r.email,
		tel: r.tel,
		birth: r.birth,
		age: ageFromBirth(r.birth),
		formation: r.formationName ?? '',
		formationCode: r.formationCode,
		formationId: r.formationId,
		year: r.year,
		city: r.city,
		postal: r.postal,
		lat: r.lat,
		lon: r.lon,
		tags: r.tags ?? [],
		skills: r.skills ?? [],
		permis: r.permis,
		vehicule: r.vehicule,
		mobile: r.mobile,
		score: r.score,
		pitch: r.pitch,
		statut: r.statut,
		rechercheStatut: r.rechercheStatut,
		placementId: r.placementId,
		statutOpco: r.statutOpco,
		createdAt: r.createdAt.toISOString(),
		cvs,
		hasCvDoc: !!r.cvPath,
		hasIdRecto: !!r.idDocPath,
		hasIdVerso: !!r.idDocVersoPath,
		idRectoKind: docKind(r.idDocPath),
		idVersoKind: docKind(r.idDocVersoPath),
		titreValide: r.titreValide,
		distanceKm: r.distanceKm
	};
}

export async function listCandidats(): Promise<CandidatRow[]> {
	const base = (await db
		.select(BASE_COLS)
		.from(candidat)
		.innerJoin(user, eq(candidat.userId, user.id))
		.leftJoin(formation, eq(candidat.formationId, formation.id))) as BaseRow[];
	const cvsBy = await attachCvs(base);
	return base.map((r) => toRow(r, cvsBy[r.id] ?? []));
}

export async function listValidatedCandidats(): Promise<CandidatRow[]> {
	const all = await listCandidats();
	return all.filter((c) => c.statut === 'valide');
}

export async function getCandidatRowForUser(userId: string): Promise<CandidatRow | null> {
	const base = (await db
		.select(BASE_COLS)
		.from(candidat)
		.innerJoin(user, eq(candidat.userId, user.id))
		.leftJoin(formation, eq(candidat.formationId, formation.id))
		.where(eq(candidat.userId, userId))
		.limit(1)) as BaseRow[];
	if (!base.length) return null;
	const cvsBy = await attachCvs(base);
	return toRow(base[0], cvsBy[base[0].id] ?? []);
}

export async function getCandidatRowById(id: number): Promise<CandidatRow | null> {
	const base = (await db
		.select(BASE_COLS)
		.from(candidat)
		.innerJoin(user, eq(candidat.userId, user.id))
		.leftJoin(formation, eq(candidat.formationId, formation.id))
		.where(eq(candidat.id, id))
		.limit(1)) as BaseRow[];
	if (!base.length) return null;
	const cvsBy = await attachCvs(base);
	return toRow(base[0], cvsBy[base[0].id] ?? []);
}

export interface SearchFilters {
	q?: string;
	statut?: string[]; // workflow CRE
	rechercheStatut?: string[];
	minScore?: number | null; // score IA minimum
	year?: number[];
	formationId?: number[];
	place?: string;
	radiusKm?: number;
	postal?: string;
	age?: number | null;
	trancheAge?: string; // "18-20" etc.
	permis?: boolean;
	vehicule?: boolean;
	mobile?: boolean;
	tags?: string[];
	skills?: string[];
}

export type SortKey = 'name' | 'score' | 'city' | 'statut' | 'createdAt';

export interface SearchOptions {
	page?: number;
	pageSize?: number;
	sortBy?: SortKey;
	sortDir?: 'asc' | 'desc';
}

export interface SearchResult {
	rows: CandidatRow[];
	page: number;
	pageSize: number;
	total: number;
	totalPages: number;
}

const PAGE_SIZE_DEFAULT = 10;

export async function searchCandidats(
	filters: SearchFilters = {},
	opts: SearchOptions = {}
): Promise<SearchResult> {
	const page = Math.max(1, opts.page ?? 1);
	const pageSize = Math.min(50, Math.max(1, opts.pageSize ?? PAGE_SIZE_DEFAULT));
	const sortBy = opts.sortBy ?? 'createdAt';
	const sortDir = opts.sortDir ?? 'desc';

	const conds: SQL[] = [];

	// On ne liste que les vrais étudiants : un compte staff (cre) qui aurait
	// par erreur une fiche candidat ne doit pas apparaître dans les listes.
	conds.push(eq(user.role, 'candidat'));

	if (filters.q?.trim()) {
		const needle = `%${filters.q.trim()}%`;
		conds.push(sql`(${candidat.lname} ILIKE ${needle} OR ${candidat.fname} ILIKE ${needle})`);
	}
	if (filters.statut?.length) conds.push(inArray(candidat.statut, filters.statut));
	if (filters.rechercheStatut?.length)
		conds.push(inArray(candidat.rechercheStatut, filters.rechercheStatut));
	if (filters.minScore != null && Number.isFinite(filters.minScore))
		conds.push(sql`${candidat.score} >= ${filters.minScore}`);
	if (filters.year?.length) conds.push(inArray(candidat.year, filters.year));
	if (filters.formationId?.length) conds.push(inArray(candidat.formationId, filters.formationId));
	// Code postal : comparaison par préfixe (progressive pendant la saisie).
	if (filters.postal?.trim())
		conds.push(sql`${candidat.postal} ILIKE ${filters.postal.trim() + '%'}`);

	// tranche d'âge — convertit en bornes sur birth date
	const today = new Date();
	const todayISO = today.toISOString().slice(0, 10);
	function birthBoundForAge(age: number): string {
		const d = new Date(today.getFullYear() - age, today.getMonth(), today.getDate());
		return d.toISOString().slice(0, 10);
	}
	if (filters.age != null && Number.isFinite(filters.age)) {
		const min = birthBoundForAge(filters.age + 1);
		const max = birthBoundForAge(filters.age);
		conds.push(sql`${candidat.birth} > ${min}::date AND ${candidat.birth} <= ${max}::date`);
	} else if (filters.trancheAge && /^\d+-\d+$/.test(filters.trancheAge)) {
		const [lo, hi] = filters.trancheAge.split('-').map(Number);
		const minBirth = birthBoundForAge(hi + 1);
		const maxBirth = birthBoundForAge(lo);
		conds.push(
			sql`${candidat.birth} > ${minBirth}::date AND ${candidat.birth} <= ${maxBirth}::date AND ${candidat.birth} <= ${todayISO}::date`
		);
	}

	if (filters.permis) conds.push(eq(candidat.permis, true));
	if (filters.vehicule) conds.push(eq(candidat.vehicule, true));
	if (filters.mobile) conds.push(eq(candidat.mobile, true));

	// tags / skills : tableau JSON contient TOUS les libellés demandés (?& opérateur).
	// Drizzle ne peut pas binder un tableau en un seul param text[] sans un cast
	// explicite côté SQL, d'où le ARRAY[…]::text[] construit avec sql.join.
	const arrayParam = (vals: string[]) =>
		sql`ARRAY[${sql.join(
			vals.map((v) => sql`${v}`),
			sql`, `
		)}]::text[]`;
	if (filters.tags?.length) {
		conds.push(sql`${candidat.tags} ?& ${arrayParam(filters.tags)}`);
	}
	if (filters.skills?.length) {
		conds.push(sql`${candidat.skills} ?& ${arrayParam(filters.skills)}`);
	}

	// Localisation — deux modes :
	//  • rayon : une ville a été choisie et un rayon est fourni → géocodage + Haversine.
	//  • chaîne : pendant la saisie → simple comparaison sur la ville (ILIKE).
	let distanceExpr: SQL<number> | null = null;
	if (filters.place?.trim()) {
		if (filters.radiusKm && filters.radiusKm > 0) {
			const point = await geocode(filters.place, filters.postal);
			if (point) {
				distanceExpr = sql<number>`(
					6371 * acos(
						least(1.0, greatest(-1.0,
							cos(radians(${point.lat})) * cos(radians(${candidat.lat}))
							* cos(radians(${candidat.lon}) - radians(${point.lon}))
							+ sin(radians(${point.lat})) * sin(radians(${candidat.lat}))
						))
					)
				)`;
				conds.push(sql`${candidat.lat} IS NOT NULL AND ${candidat.lon} IS NOT NULL`);
				conds.push(sql`${distanceExpr} <= ${filters.radiusKm}`);
			}
		} else {
			conds.push(sql`${candidat.city} ILIKE ${'%' + filters.place.trim() + '%'}`);
		}
	}

	const where = conds.length ? and(...conds) : undefined;

	const sortCols = {
		name: candidat.lname,
		score: candidat.score,
		city: candidat.city,
		statut: candidat.statut,
		createdAt: candidat.createdAt
	} as const;
	const sortCol = sortCols[sortBy] ?? candidat.createdAt;
	const orderBy = sortDir === 'asc' ? asc(sortCol) : desc(sortCol);

	const selectCols = distanceExpr
		? { ...BASE_COLS, distanceKm: distanceExpr }
		: BASE_COLS;

	const totalRow = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(candidat)
		.innerJoin(user, eq(candidat.userId, user.id))
		.leftJoin(formation, eq(candidat.formationId, formation.id))
		.where(where);
	const total = totalRow[0]?.count ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / pageSize));

	const base = (await db
		.select(selectCols)
		.from(candidat)
		.innerJoin(user, eq(candidat.userId, user.id))
		.leftJoin(formation, eq(candidat.formationId, formation.id))
		.where(where)
		.orderBy(orderBy)
		.limit(pageSize)
		.offset((page - 1) * pageSize)) as BaseRow[];

	const cvsBy = await attachCvs(base);
	const rows = base.map((r) => toRow(r, cvsBy[r.id] ?? []));
	return { rows, page, pageSize, total, totalPages };
}

// Formations masquées des listes de sélection (réversible : retirer le code).
// Les étudiants déjà rattachés à ces formations ne sont pas impactés (données conservées).
export const HIDDEN_FORMATION_CODES = ['BTS OL'];

export async function listFormations() {
	const rows = await db.select().from(formation).orderBy(asc(formation.id));
	return rows.filter((f) => !HIDDEN_FORMATION_CODES.includes(f.code));
}

// ─── Paramètres (formations / promos / admins) ───────────────────────────────

// Formations + nombre d'étudiants rattachés : sert la page Paramètres (affichage
// et garde-fou de suppression, la FK candidat.formation_id étant en ON DELETE
// restrict). Inclut les formations masquées volontairement pour rester gérables.
export async function listFormationsWithCounts() {
	return db
		.select({
			id: formation.id,
			code: formation.code,
			name: formation.name,
			schoolId: formation.schoolId,
			schoolName: school.name,
			studentCount: sql<number>`count(${candidat.id})::int`
		})
		.from(formation)
		.leftJoin(candidat, eq(candidat.formationId, formation.id))
		.leftJoin(school, eq(formation.schoolId, school.id))
		.groupBy(formation.id, school.name)
		.orderBy(asc(formation.id));
}

// Promos gérées depuis la page Paramètres, plus récentes d'abord.
export async function listPromos() {
	return db
		.select({
			id: promo.id,
			label: promo.label,
			year: promo.year,
			formationId: promo.formationId,
			formationName: formation.name,
			schoolId: promo.schoolId,
			schoolName: school.name
		})
		.from(promo)
		.leftJoin(formation, eq(promo.formationId, formation.id))
		.leftJoin(school, eq(promo.schoolId, school.id))
		.orderBy(desc(promo.year), asc(promo.label));
}

// Écoles du référentiel + nombre de membres rattachés (page Paramètres).
export async function listSchools() {
	return db
		.select({
			id: school.id,
			name: school.name,
			type: school.type,
			reglementUrl: school.reglementUrl,
			memberCount: sql<number>`count(${user.id})::int`
		})
		.from(school)
		.leftJoin(user, eq(user.schoolId, school.id))
		.groupBy(school.id)
		.orderBy(asc(school.name));
}

// Nom d'une école (affichage du tableau de bord candidat).
export async function schoolNameById(id: number): Promise<string | null> {
	const rows = await db
		.select({ name: school.name })
		.from(school)
		.where(eq(school.id, id))
		.limit(1);
	return rows[0]?.name ?? null;
}

// Autres membres de l'école (rôle « cre ») visibles depuis la page Paramètres.
export async function listAdmins() {
	return db
		.select({
			id: user.id,
			name: user.name,
			email: user.email,
			schoolId: user.schoolId,
			schoolName: school.name,
			avatar: user.avatar,
			createdAt: user.createdAt
		})
		.from(user)
		.leftJoin(school, eq(user.schoolId, school.id))
		.where(eq(user.role, 'cre'))
		.orderBy(asc(user.name));
}

// Référentiel complet des compétences (libellés), trié alphabétiquement.
export async function listCompetences(): Promise<string[]> {
	const rows = await db
		.select({ label: competence.label })
		.from(competence)
		.orderBy(asc(competence.label));
	return rows.map((r) => r.label);
}

// Compétences rattachées à une formation donnée. Si la formation n'a aucune
// compétence liée (ou est nulle), on retombe sur le référentiel complet.
export async function listCompetencesForFormation(
	formationId: number | null | undefined
): Promise<string[]> {
	if (formationId == null) return listCompetences();
	const rows = await db
		.select({ label: competence.label })
		.from(formationCompetence)
		.innerJoin(competence, eq(competence.id, formationCompetence.competenceId))
		.where(eq(formationCompetence.formationId, formationId))
		.orderBy(asc(competence.label));
	const labels = rows.map((r) => r.label);
	return labels.length ? labels : listCompetences();
}

export async function listStaffFormations(userId: string): Promise<number[]> {
	const rows = await db
		.select({ id: staffFormation.formationId })
		.from(staffFormation)
		.where(eq(staffFormation.userId, userId));
	return rows.map((r) => r.id);
}

// Catalogue de tags / compétences proposé à la recherche (datalist).
// Garde le minimum côté code, le reste viendra naturellement des candidats.
export const DEFAULT_TAGS = ['Eloquence', 'Optimiste', 'Curieux', 'Déterminé', 'Autonome', 'Rigoureux'];

export const DEFAULT_SKILLS = [
	'JavaScript',
	'TypeScript',
	'React',
	'Svelte',
	'Node.js',
	'Python',
	'SQL',
	'Figma',
	'Photoshop',
	'Anglais',
	'Espagnol',
	'Excel',
	'PowerPoint',
	'Communication',
	'Gestion de projet'
];

// Mapping skill → famille pour colorer les puces.
export const SKILL_TYPES: Record<string, 'dev' | 'design' | 'lang' | 'office' | 'soft'> = {
	JavaScript: 'dev',
	TypeScript: 'dev',
	React: 'dev',
	Svelte: 'dev',
	'Node.js': 'dev',
	Python: 'dev',
	SQL: 'dev',
	Figma: 'design',
	Photoshop: 'design',
	Anglais: 'lang',
	Espagnol: 'lang',
	Excel: 'office',
	PowerPoint: 'office',
	Communication: 'soft',
	'Gestion de projet': 'soft'
};

export function getSkillType(skill: string): 'dev' | 'design' | 'lang' | 'office' | 'soft' {
	return SKILL_TYPES[skill] ?? 'soft';
}
