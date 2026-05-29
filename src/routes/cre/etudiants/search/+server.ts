import { json, type RequestHandler } from '@sveltejs/kit';
import { searchCandidats, type SearchFilters, type SortKey } from '$lib/server/queries';

const SORT_KEYS: SortKey[] = ['name', 'score', 'city', 'statut', 'createdAt'];

export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
	const arr = (v: unknown): string[] =>
		Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
	const numArr = (v: unknown): number[] =>
		Array.isArray(v) ? v.map(Number).filter((n) => Number.isFinite(n)) : [];

	const sortByRaw = String(body.sortBy ?? 'createdAt');
	const sortBy: SortKey = SORT_KEYS.includes(sortByRaw as SortKey)
		? (sortByRaw as SortKey)
		: 'createdAt';

	const filters: SearchFilters = {
		q: typeof body.q === 'string' ? body.q : '',
		statut: arr(body.statut),
		rechercheStatut: arr(body.rechercheStatut),
		year: numArr(body.year),
		formationId: numArr(body.formationId),
		place: typeof body.place === 'string' ? body.place : '',
		radiusKm: body.radiusKm ? Number(body.radiusKm) : undefined,
		postal: typeof body.postal === 'string' ? body.postal : '',
		age: body.age != null && body.age !== '' ? Number(body.age) : null,
		trancheAge: typeof body.trancheAge === 'string' ? body.trancheAge : '',
		permis: !!body.permis,
		vehicule: !!body.vehicule,
		mobile: !!body.mobile,
		tags: arr(body.tags),
		skills: arr(body.skills)
	};

	const page = Number(body.page) || 1;
	const pageSize = Number(body.pageSize) || 10;
	const sortDir = body.sortDir === 'asc' ? 'asc' : 'desc';

	const result = await searchCandidats(filters, { page, pageSize, sortBy, sortDir });
	return json({ success: true, ...result });
};
