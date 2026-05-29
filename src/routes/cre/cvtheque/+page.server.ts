import type { PageServerLoad } from './$types';
import { listCandidats } from '$lib/server/queries';

export const load: PageServerLoad = async () => {
	const candidats = await listCandidats();
	return { candidats };
};
