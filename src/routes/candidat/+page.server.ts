import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { cv } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ parent }) => {
	const { candidat, user } = await parent();
	if (!candidat) return { cvCount: 0, user, candidat: null };
	const cvs = await db.select().from(cv).where(eq(cv.candidatId, candidat.id));
	return { cvCount: cvs.length, user, candidat };
};
