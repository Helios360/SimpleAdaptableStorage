import type { PageServerLoad } from './$types';
import { listCandidats } from '$lib/server/queries';

export const load: PageServerLoad = async () => {
	const all = await listCandidats();
	return { candidats: all };
};
