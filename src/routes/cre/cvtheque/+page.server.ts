import type { PageServerLoad } from './$types';
import { searchCandidats, listFormations, type SearchFilters } from '$lib/server/queries';

export const load: PageServerLoad = async ({ url }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';
	const minScoreRaw = url.searchParams.get('minScore') ?? '';
	const formationRaw = url.searchParams.get('formationId') ?? '';

	const minScore = minScoreRaw && Number.isFinite(Number(minScoreRaw)) ? Number(minScoreRaw) : null;
	const formationId = formationRaw && Number.isFinite(Number(formationRaw)) ? Number(formationRaw) : null;

	const filters: SearchFilters = {
		q: q || undefined,
		minScore,
		formationId: formationId != null ? [formationId] : undefined
	};

	const [result, formations] = await Promise.all([
		searchCandidats(filters, { page: 1, pageSize: 50, sortBy: 'score', sortDir: 'desc' }),
		listFormations()
	]);

	return {
		candidats: result.rows,
		total: result.total,
		formations,
		filters: { q, minScore: minScoreRaw, formationId: formationRaw }
	};
};
