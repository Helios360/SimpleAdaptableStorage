import { fail } from '@sveltejs/kit';
import { eq, desc, inArray, sql } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { envoi, envoiEtudiant } from '$lib/server/db/schema';
import { requireRole } from '$lib/server/guards';
import { listCandidats } from '$lib/server/queries';

export const load: PageServerLoad = async ({ locals, url }) => {
	requireRole(locals.user, 'cre');

	const envois = await db
		.select()
		.from(envoi)
		.where(eq(envoi.creId, locals.user.id))
		.orderBy(desc(envoi.createdAt));

	let counts: Record<number, number> = {};
	if (envois.length) {
		const rows = await db
			.select({ envoiId: envoiEtudiant.envoiId, n: sql<number>`count(*)::int` })
			.from(envoiEtudiant)
			.where(
				inArray(
					envoiEtudiant.envoiId,
					envois.map((e) => e.id)
				)
			)
			.groupBy(envoiEtudiant.envoiId);
		counts = Object.fromEntries(rows.map((r) => [r.envoiId, r.n]));
	}

	const candidats = await listCandidats();

	// Présélection depuis la CVthèque (?students=1,2,3)
	const preselect = (url.searchParams.get('students') ?? '')
		.split(',')
		.map(Number)
		.filter(Number.isFinite);

	return {
		envois: envois.map((e) => ({ ...e, nbProfils: counts[e.id] ?? 0 })),
		students: candidats.map((c) => ({ id: c.id, name: c.name, formation: c.formation })),
		preselect
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		requireRole(locals.user, 'cre');
		const form = await request.formData();
		const entreprise = String(form.get('entreprise') ?? '').trim();
		const email = String(form.get('email') ?? '').trim();
		const contact = String(form.get('contact') ?? '').trim() || null;
		const message = String(form.get('message') ?? '').trim() || null;
		const studentIds = String(form.get('studentIds') ?? '')
			.split(',')
			.map(Number)
			.filter(Number.isFinite);

		if (!entreprise) return fail(400, { error: "Nom de l'entreprise requis." });
		if (!/\S+@\S+\.\S+/.test(email)) return fail(400, { error: 'Email recruteur invalide.' });
		if (studentIds.length === 0) return fail(400, { error: 'Sélectionnez au moins un étudiant.' });

		const [created] = await db
			.insert(envoi)
			.values({
				entreprise,
				contact,
				email,
				message,
				statut: 'envoye',
				school: (locals.user as { school?: string | null }).school ?? null,
				creId: locals.user.id
			})
			.returning({ id: envoi.id });

		await db
			.insert(envoiEtudiant)
			.values(studentIds.map((candidatId) => ({ envoiId: created.id, candidatId })));

		return { success: true, created: true };
	},
	open: async ({ request, locals }) => {
		requireRole(locals.user, 'cre');
		const form = await request.formData();
		const id = Number(form.get('id'));
		if (!Number.isFinite(id)) return fail(400);
		await db
			.update(envoi)
			.set({ opens: sql`${envoi.opens} + 1`, statut: 'ouvert', lastOpenAt: new Date() })
			.where(eq(envoi.id, id));
		return { success: true };
	},
	relance: async ({ request, locals }) => {
		requireRole(locals.user, 'cre');
		const form = await request.formData();
		const id = Number(form.get('id'));
		if (!Number.isFinite(id)) return fail(400);
		// Relance = simple notification (log). L'envoi reste en l'état.
		console.log(`[relance] CRE ${locals.user.id} relance l'envoi ${id}`);
		return { success: true, relanced: true };
	}
};
