import { eq, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { candidature, envoi } from '$lib/server/db/schema';
import { requireRole } from '$lib/server/guards';
import { listCandidats } from '$lib/server/queries';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals.user, 'cre');

	const candidats = await listCandidats();

	const apps = candidats.length
		? await db
				.select({ candidatId: candidature.candidatId, n: sql<number>`count(*)::int` })
				.from(candidature)
				.groupBy(candidature.candidatId)
		: [];
	const appBy = Object.fromEntries(apps.map((a) => [a.candidatId, a.n]));

	const envoisRow = await db
		.select({ n: sql<number>`count(*)::int` })
		.from(envoi)
		.where(eq(envoi.creId, locals.user.id));
	const envoisCount = envoisRow[0]?.n ?? 0;

	const testsDone = candidats.filter((c) => c.score != null).length;
	const valides = candidats.filter((c) => c.statut === 'valide').length;
	const enRecherche = candidats.filter(
		(c) => c.rechercheStatut === 'active' || c.rechercheStatut === 'recherche'
	).length;

	return {
		stats: { total: candidats.length, testsDone, valides, enRecherche, envois: envoisCount },
		rows: candidats
			.map((c) => ({
				id: c.id,
				name: c.name,
				formation: c.formation,
				score: c.score,
				statut: c.statut,
				apps: appBy[c.id] ?? 0
			}))
			.sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
	};
};
