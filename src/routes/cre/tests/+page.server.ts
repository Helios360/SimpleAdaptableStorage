import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { offre } from '$lib/server/db/schema';
import { requireRole } from '$lib/server/guards';
import { listCandidats } from '$lib/server/queries';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals.user, 'cre');
	const [offres, candidats] = await Promise.all([
		db.select({ id: offre.id, titre: offre.titre, entreprise: offre.entreprise }).from(offre),
		listCandidats()
	]);
	return {
		offres,
		students: candidats.map((c) => ({ id: c.id, name: c.name, formation: c.formation }))
	};
};
