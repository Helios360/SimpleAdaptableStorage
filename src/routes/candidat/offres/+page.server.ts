import { fail } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { offre, candidature } from '$lib/server/db/schema';
import { loadCandidatForUser } from '$lib/server/guards';

export const load: PageServerLoad = async () => {
	const offres = await db.select().from(offre);
	return { offres };
};

export const actions: Actions = {
	apply: async ({ request, locals }) => {
		if (!locals.user) return fail(401);
		const c = await loadCandidatForUser(locals.user.id);
		if (!c) return fail(400);

		const form = await request.formData();
		const offreId = Number(form.get('offreId'));
		if (!Number.isFinite(offreId)) return fail(400);

		const existing = await db
			.select()
			.from(candidature)
			.where(and(eq(candidature.candidatId, c.id), eq(candidature.offreId, offreId)))
			.limit(1);
		if (existing[0]) return { alreadyApplied: true };

		await db.insert(candidature).values({ candidatId: c.id, offreId, statut: 'envoyee' });
		return { success: true };
	}
};
