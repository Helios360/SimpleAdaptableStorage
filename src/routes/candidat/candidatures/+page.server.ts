import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { candidature, offre } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ parent }) => {
	const { candidat } = await parent();
	if (!candidat) return { rows: [] };
	const rows = await db
		.select({
			id: candidature.id,
			statut: candidature.statut,
			date: candidature.createdAt,
			titre: offre.titre,
			entreprise: offre.entreprise
		})
		.from(candidature)
		.innerJoin(offre, eq(candidature.offreId, offre.id))
		.where(eq(candidature.candidatId, candidat.id));
	return { rows };
};
