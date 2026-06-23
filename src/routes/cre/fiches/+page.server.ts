import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { offre } from '$lib/server/db/schema';
import { requireRole } from '$lib/server/guards';
import { listCandidats } from '$lib/server/queries';

const VALID_TYPES = ['Stage', 'Alternance', 'CDI', 'CDD'];

function parseSkills(raw: unknown): string[] {
	return String(raw ?? '')
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean)
		.slice(0, 20);
}

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals.user, 'cre');
	const [offres, candidats] = await Promise.all([
		db.select().from(offre).orderBy(offre.id),
		listCandidats()
	]);
	return {
		offres,
		students: candidats.map((c) => ({ id: c.id, name: c.name, formation: c.formation }))
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		requireRole(locals.user, 'cre');
		const form = await request.formData();
		const titre = String(form.get('titre') ?? '').trim();
		const entreprise = String(form.get('entreprise') ?? '').trim();
		if (!titre || !entreprise) return fail(400, { error: 'Titre et entreprise requis.' });

		const typeRaw = String(form.get('type') ?? '').trim();
		const type = VALID_TYPES.includes(typeRaw) ? typeRaw : 'Stage';

		await db.insert(offre).values({
			titre,
			entreprise,
			lieu: String(form.get('lieu') ?? '').trim() || 'À distance',
			type,
			niveau: String(form.get('niveau') ?? '').trim() || null,
			description: String(form.get('description') ?? '').trim() || null,
			skills: parseSkills(form.get('skills')),
			date: new Date().toISOString().slice(0, 10),
			active: form.get('active') !== 'false',
			school: (locals.user as { school?: string | null }).school ?? null,
			creId: locals.user.id
		});
		return { success: true, created: true };
	},
	toggle: async ({ request, locals }) => {
		requireRole(locals.user, 'cre');
		const form = await request.formData();
		const id = Number(form.get('id'));
		if (!Number.isFinite(id)) return fail(400);
		const rows = await db.select({ active: offre.active }).from(offre).where(eq(offre.id, id)).limit(1);
		if (!rows.length) return fail(404);
		await db.update(offre).set({ active: !rows[0].active }).where(eq(offre.id, id));
		return { success: true, active: !rows[0].active };
	},
	propose: async ({ request, locals }) => {
		requireRole(locals.user, 'cre');
		const form = await request.formData();
		const offreId = Number(form.get('offreId'));
		const studentIds = String(form.get('studentIds') ?? '')
			.split(',')
			.map(Number)
			.filter(Number.isFinite);
		if (!Number.isFinite(offreId) || studentIds.length === 0) {
			return fail(400, { error: 'Sélectionnez au moins un étudiant.' });
		}
		// Proposition enregistrée comme notification (log serveur). Les étudiants
		// retrouvent l'offre dans leur espace candidat /candidat/offres.
		console.log(`[propose] CRE ${locals.user.id} → offre ${offreId} aux candidats`, studentIds);
		return { success: true, proposed: studentIds.length };
	}
};
