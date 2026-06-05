import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { offre } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ locals }) => {
	const company = (locals.user as { company?: string | null } | null)?.company ?? null;

	// On ne montre au recruteur que les offres de son entreprise.
	const offres = company
		? await db.select().from(offre).where(eq(offre.entreprise, company))
		: [];

	return { offres, company };
};
