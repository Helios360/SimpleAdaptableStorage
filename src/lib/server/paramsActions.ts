/**
 * Actions de la page Paramètres (/cre/parametres) : CRUD des écoles, formations
 * et promos, y compris les documents PDF qui leur sont rattachés (référentiel,
 * calendrier, règlement intérieur). Réservées au rôle « cre » (École). La liste
 * des admins est en lecture seule et vit dans le loader, pas ici.
 */
import { fail, type RequestEvent } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { candidat, formation, promo, school } from '$lib/server/db/schema';
import { requireRole } from '$lib/server/guards';
import { deleteUpload, saveOptionalUpload, PDF_SLOT } from '$lib/server/uploads';
import { validateFormation, validatePromo, validateSchool } from '$lib/paramsLogic';
import { schoolType } from '$lib/checklist';

/** Détecte une violation de contrainte d'unicité Postgres (code 23505). */
function isUniqueViolation(err: unknown): boolean {
	return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505';
}

// ─── Documents PDF rattachés au référentiel ─────────────────────────────────
// Un seul document par entité : le formulaire d'édition porte le champ fichier
// (`doc`) et une case « retirer le document » (`removeDoc`). Les fichiers vivent
// sous uploads/<kind>/, et le chemin relatif est stocké en base.

type DocKind = 'referentiel' | 'calendrier' | 'reglement';

/**
 * Applique le champ fichier d'un formulaire : dépôt d'un nouveau PDF, retrait du
 * document existant, ou statu quo. Renvoie le chemin à écrire en base, ou une
 * erreur de validation à remonter telle quelle.
 */
async function applyDoc(
	form: FormData,
	kind: DocKind,
	id: number,
	existingPath: string | null
): Promise<{ path: string | null; error?: string }> {
	if (form.get('removeDoc')) {
		if (existingPath) await deleteUpload(existingPath);
		return { path: null };
	}
	return saveOptionalUpload(form, 'doc', PDF_SLOT, kind, `${kind}_${id}`, existingPath);
}

async function createFormation({ request, locals }: RequestEvent) {
	requireRole(locals.user, 'cre');
	const form = await request.formData();
	const v = validateFormation(form.get('code'), form.get('name'), form.get('schoolId'));
	if (!v.ok) return fail(400, { error: v.error });
	let id: number;
	try {
		const [row] = await db.insert(formation).values(v.value).returning({ id: formation.id });
		id = row.id;
	} catch (err) {
		if (isUniqueViolation(err)) return fail(409, { error: 'Ce code de formation existe déjà.' });
		throw err;
	}
	// Le référentiel est nommé d'après l'id, d'où le dépôt après l'insertion.
	const doc = await applyDoc(form, 'referentiel', id, null);
	if (doc.error) return fail(400, { error: doc.error });
	if (doc.path) {
		await db.update(formation).set({ referentielPath: doc.path }).where(eq(formation.id, id));
	}
	return { ok: true };
}

async function updateFormation({ request, locals }: RequestEvent) {
	requireRole(locals.user, 'cre');
	const form = await request.formData();
	const id = Number(form.get('id'));
	if (!Number.isInteger(id)) return fail(400, { error: 'Formation invalide.' });
	const v = validateFormation(form.get('code'), form.get('name'), form.get('schoolId'));
	if (!v.ok) return fail(400, { error: v.error });
	const [prev] = await db
		.select({ referentielPath: formation.referentielPath })
		.from(formation)
		.where(eq(formation.id, id))
		.limit(1);
	if (!prev) return fail(404, { error: 'Formation introuvable.' });
	const doc = await applyDoc(form, 'referentiel', id, prev.referentielPath);
	if (doc.error) return fail(400, { error: doc.error });
	try {
		await db
			.update(formation)
			.set({ ...v.value, referentielPath: doc.path })
			.where(eq(formation.id, id));
	} catch (err) {
		if (isUniqueViolation(err)) return fail(409, { error: 'Ce code de formation existe déjà.' });
		throw err;
	}
	return { ok: true };
}

async function deleteFormation({ request, locals }: RequestEvent) {
	requireRole(locals.user, 'cre');
	const form = await request.formData();
	const id = Number(form.get('id'));
	if (!Number.isInteger(id)) return fail(400, { error: 'Formation invalide.' });
	// La FK candidat.formation_id est en ON DELETE restrict : on refuse la
	// suppression tant qu'un étudiant y est rattaché (message clair plutôt qu'une
	// erreur SQL brute).
	const [{ n }] = await db
		.select({ n: sql<number>`count(*)::int` })
		.from(candidat)
		.where(eq(candidat.formationId, id));
	if (n > 0) {
		return fail(409, {
			error: `Impossible de supprimer : ${n} étudiant(s) rattaché(s) à cette formation.`
		});
	}
	const [row] = await db
		.select({ referentielPath: formation.referentielPath })
		.from(formation)
		.where(eq(formation.id, id))
		.limit(1);
	await db.delete(formation).where(eq(formation.id, id));
	if (row?.referentielPath) await deleteUpload(row.referentielPath);
	return { ok: true };
}

async function createPromo({ request, locals }: RequestEvent) {
	requireRole(locals.user, 'cre');
	const form = await request.formData();
	const v = validatePromo(
		form.get('label'),
		form.get('year'),
		form.get('dateRentree'),
		form.get('formationId'),
		form.get('schoolId')
	);
	if (!v.ok) return fail(400, { error: v.error });
	let id: number;
	try {
		const [row] = await db.insert(promo).values(v.value).returning({ id: promo.id });
		id = row.id;
	} catch (err) {
		if (isUniqueViolation(err)) return fail(409, { error: 'Une promo porte déjà ce nom.' });
		throw err;
	}
	const doc = await applyDoc(form, 'calendrier', id, null);
	if (doc.error) return fail(400, { error: doc.error });
	if (doc.path) await db.update(promo).set({ calendrierPath: doc.path }).where(eq(promo.id, id));
	return { ok: true };
}

async function updatePromo({ request, locals }: RequestEvent) {
	requireRole(locals.user, 'cre');
	const form = await request.formData();
	const id = Number(form.get('id'));
	if (!Number.isInteger(id)) return fail(400, { error: 'Promo invalide.' });
	const v = validatePromo(
		form.get('label'),
		form.get('year'),
		form.get('dateRentree'),
		form.get('formationId'),
		form.get('schoolId')
	);
	if (!v.ok) return fail(400, { error: v.error });
	const [prev] = await db
		.select({ calendrierPath: promo.calendrierPath })
		.from(promo)
		.where(eq(promo.id, id))
		.limit(1);
	if (!prev) return fail(404, { error: 'Promo introuvable.' });
	const doc = await applyDoc(form, 'calendrier', id, prev.calendrierPath);
	if (doc.error) return fail(400, { error: doc.error });
	try {
		await db
			.update(promo)
			.set({ ...v.value, calendrierPath: doc.path })
			.where(eq(promo.id, id));
	} catch (err) {
		if (isUniqueViolation(err)) return fail(409, { error: 'Une promo porte déjà ce nom.' });
		throw err;
	}
	return { ok: true };
}

async function deletePromo({ request, locals }: RequestEvent) {
	requireRole(locals.user, 'cre');
	const form = await request.formData();
	const id = Number(form.get('id'));
	if (!Number.isInteger(id)) return fail(400, { error: 'Promo invalide.' });
	const [row] = await db
		.select({ calendrierPath: promo.calendrierPath })
		.from(promo)
		.where(eq(promo.id, id))
		.limit(1);
	await db.delete(promo).where(eq(promo.id, id));
	if (row?.calendrierPath) await deleteUpload(row.calendrierPath);
	return { ok: true };
}

// Le `type` (pour la checklist) est dérivé du nom, pas saisi par l'admin.
async function createSchool({ request, locals }: RequestEvent) {
	requireRole(locals.user, 'cre');
	const form = await request.formData();
	const v = validateSchool(form.get('name'), form.get('mailTemplate'));
	if (!v.ok) return fail(400, { error: v.error });
	let id: number;
	try {
		const [row] = await db
			.insert(school)
			.values({
				name: v.value.name,
				type: schoolType(v.value.name),
				mailTemplate: v.value.mailTemplate
			})
			.returning({ id: school.id });
		id = row.id;
	} catch (err) {
		if (isUniqueViolation(err)) return fail(409, { error: 'Une école porte déjà ce nom.' });
		throw err;
	}
	const doc = await applyDoc(form, 'reglement', id, null);
	if (doc.error) return fail(400, { error: doc.error });
	if (doc.path) await db.update(school).set({ reglementPath: doc.path }).where(eq(school.id, id));
	return { ok: true };
}

async function updateSchool({ request, locals }: RequestEvent) {
	requireRole(locals.user, 'cre');
	const form = await request.formData();
	const id = Number(form.get('id'));
	if (!Number.isInteger(id)) return fail(400, { error: 'École invalide.' });
	const v = validateSchool(form.get('name'), form.get('mailTemplate'));
	if (!v.ok) return fail(400, { error: v.error });
	const [prev] = await db
		.select({ reglementPath: school.reglementPath })
		.from(school)
		.where(eq(school.id, id))
		.limit(1);
	if (!prev) return fail(404, { error: 'École introuvable.' });
	const doc = await applyDoc(form, 'reglement', id, prev.reglementPath);
	if (doc.error) return fail(400, { error: doc.error });
	try {
		await db
			.update(school)
			.set({
				name: v.value.name,
				type: schoolType(v.value.name),
				mailTemplate: v.value.mailTemplate,
				reglementPath: doc.path
			})
			.where(eq(school.id, id));
	} catch (err) {
		if (isUniqueViolation(err)) return fail(409, { error: 'Une école porte déjà ce nom.' });
		throw err;
	}
	return { ok: true };
}

async function deleteSchool({ request, locals }: RequestEvent) {
	requireRole(locals.user, 'cre');
	const form = await request.formData();
	const id = Number(form.get('id'));
	if (!Number.isInteger(id)) return fail(400, { error: 'École invalide.' });
	// FK en ON DELETE set null partout : les lignes rattachées ne sont pas
	// supprimées, seul le rattachement est retiré.
	const [row] = await db
		.select({ reglementPath: school.reglementPath })
		.from(school)
		.where(eq(school.id, id))
		.limit(1);
	await db.delete(school).where(eq(school.id, id));
	if (row?.reglementPath) await deleteUpload(row.reglementPath);
	return { ok: true };
}

export const paramsActions = {
	createFormation,
	updateFormation,
	deleteFormation,
	createPromo,
	updatePromo,
	deletePromo,
	createSchool,
	updateSchool,
	deleteSchool
};
