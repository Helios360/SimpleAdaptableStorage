/**
 * Actions de la page Paramètres (/cre/parametres) : CRUD des formations et des
 * promos. Réservées au rôle « cre » (École). La liste des admins est en lecture
 * seule et vit dans le loader, pas ici.
 */
import { fail, type RequestEvent } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { candidat, formation, promo, school } from '$lib/server/db/schema';
import { requireRole } from '$lib/server/guards';
import { validateFormation, validatePromo, validateSchool } from '$lib/paramsLogic';
import { schoolType } from '$lib/checklist';

/** Détecte une violation de contrainte d'unicité Postgres (code 23505). */
function isUniqueViolation(err: unknown): boolean {
	return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505';
}

async function createFormation({ request, locals }: RequestEvent) {
	requireRole(locals.user, 'cre');
	const form = await request.formData();
	const v = validateFormation(form.get('code'), form.get('name'), form.get('schoolId'));
	if (!v.ok) return fail(400, { error: v.error });
	try {
		await db.insert(formation).values(v.value);
	} catch (err) {
		if (isUniqueViolation(err)) return fail(409, { error: 'Ce code de formation existe déjà.' });
		throw err;
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
	try {
		await db.update(formation).set(v.value).where(eq(formation.id, id));
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
	await db.delete(formation).where(eq(formation.id, id));
	return { ok: true };
}

async function createPromo({ request, locals }: RequestEvent) {
	requireRole(locals.user, 'cre');
	const form = await request.formData();
	const v = validatePromo(
		form.get('label'),
		form.get('year'),
		form.get('formationId'),
		form.get('schoolId')
	);
	if (!v.ok) return fail(400, { error: v.error });
	try {
		await db.insert(promo).values(v.value);
	} catch (err) {
		if (isUniqueViolation(err)) return fail(409, { error: 'Une promo porte déjà ce nom.' });
		throw err;
	}
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
		form.get('formationId'),
		form.get('schoolId')
	);
	if (!v.ok) return fail(400, { error: v.error });
	try {
		await db.update(promo).set(v.value).where(eq(promo.id, id));
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
	await db.delete(promo).where(eq(promo.id, id));
	return { ok: true };
}

// Le `type` (pour la checklist) est dérivé du nom, pas saisi par l'admin.
async function createSchool({ request, locals }: RequestEvent) {
	requireRole(locals.user, 'cre');
	const form = await request.formData();
	const v = validateSchool(form.get('name'), form.get('reglementUrl'));
	if (!v.ok) return fail(400, { error: v.error });
	try {
		await db.insert(school).values({
			name: v.value.name,
			type: schoolType(v.value.name),
			reglementUrl: v.value.reglementUrl
		});
	} catch (err) {
		if (isUniqueViolation(err)) return fail(409, { error: 'Une école porte déjà ce nom.' });
		throw err;
	}
	return { ok: true };
}

async function updateSchool({ request, locals }: RequestEvent) {
	requireRole(locals.user, 'cre');
	const form = await request.formData();
	const id = Number(form.get('id'));
	if (!Number.isInteger(id)) return fail(400, { error: 'École invalide.' });
	const v = validateSchool(form.get('name'), form.get('reglementUrl'));
	if (!v.ok) return fail(400, { error: v.error });
	try {
		await db
			.update(school)
			.set({ name: v.value.name, type: schoolType(v.value.name), reglementUrl: v.value.reglementUrl })
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
	await db.delete(school).where(eq(school.id, id));
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
