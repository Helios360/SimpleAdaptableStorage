import { fail } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { retenu } from '$lib/server/db/schema';
import { listCandidats } from '$lib/server/queries';

export const load: PageServerLoad = async ({ parent }) => {
	const { retenuIds } = await parent();
	if (retenuIds.length === 0) return { candidats: [] };
	const all = await listCandidats();
	const set = new Set(retenuIds);
	return { candidats: all.filter((c) => set.has(c.id)) };
};

export const actions: Actions = {
	remove: async ({ request, locals }) => {
		if (!locals.user) return fail(401);
		const form = await request.formData();
		const candidatId = Number(form.get('candidatId'));
		if (!Number.isFinite(candidatId)) return fail(400);
		await db
			.delete(retenu)
			.where(and(eq(retenu.recruteurId, locals.user.id), eq(retenu.candidatId, candidatId)));
		return { success: true };
	}
};
