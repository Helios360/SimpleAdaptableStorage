import { fail } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { retenu } from '$lib/server/db/schema';
import { listValidatedCandidats } from '$lib/server/queries';

export const load: PageServerLoad = async () => {
	const candidats = await listValidatedCandidats();
	return { candidats };
};

export const actions: Actions = {
	toggle: async ({ request, locals }) => {
		if (!locals.user) return fail(401);
		const form = await request.formData();
		const candidatId = Number(form.get('candidatId'));
		if (!Number.isFinite(candidatId)) return fail(400);

		const existing = await db
			.select()
			.from(retenu)
			.where(and(eq(retenu.recruteurId, locals.user.id), eq(retenu.candidatId, candidatId)))
			.limit(1);

		if (existing[0]) {
			await db
				.delete(retenu)
				.where(and(eq(retenu.recruteurId, locals.user.id), eq(retenu.candidatId, candidatId)));
			return { success: true, action: 'removed' };
		}
		await db.insert(retenu).values({ recruteurId: locals.user.id, candidatId });
		return { success: true, action: 'added' };
	}
};
