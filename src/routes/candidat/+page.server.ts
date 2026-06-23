import { eq, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { cv, candidature } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ parent }) => {
	const { candidat, user } = await parent();
	if (!candidat) return { cvCount: 0, appCount: 0, entretienCount: 0, user, candidat: null };

	const [cvs, appStats] = await Promise.all([
		db.select().from(cv).where(eq(cv.candidatId, candidat.id)),
		db
			.select({
				total: sql<number>`count(*)::int`,
				entretiens: sql<number>`count(*) filter (where ${candidature.statut} = 'entretien')::int`
			})
			.from(candidature)
			.where(eq(candidature.candidatId, candidat.id))
	]);

	return {
		cvCount: cvs.length,
		appCount: appStats[0]?.total ?? 0,
		entretienCount: appStats[0]?.entretiens ?? 0,
		user,
		candidat
	};
};
