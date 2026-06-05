import { fail } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { retenu } from '$lib/server/db/schema';
import { searchCandidats, type SearchFilters } from '$lib/server/queries';

export const load: PageServerLoad = async ({ url }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';
	const minScoreRaw = url.searchParams.get('minScore') ?? '';
	const minScore = minScoreRaw && Number.isFinite(Number(minScoreRaw)) ? Number(minScoreRaw) : null;

	// Recruteur : tous les candidats validés (toutes écoles confondues) + filtres.
	const filters: SearchFilters = { statut: ['valide'], q: q || undefined, minScore };
	const result = await searchCandidats(filters, {
		page: 1,
		pageSize: 50,
		sortBy: 'score',
		sortDir: 'desc'
	});

	return {
		candidats: result.rows,
		total: result.total,
		filters: { q, minScore: minScoreRaw }
	};
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
