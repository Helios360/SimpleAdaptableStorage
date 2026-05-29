import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { offre } from '$lib/server/db/schema';

export const load: PageServerLoad = async () => {
	const offres = await db.select().from(offre);
	return { offres };
};
