import type { LayoutServerLoad } from './$types';
import { requireRole } from '$lib/server/guards';
import { db } from '$lib/server/db';
import { retenu } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ locals }) => {
	requireRole(locals.user, 'recruteur');
	const rows = await db
		.select({ candidatId: retenu.candidatId })
		.from(retenu)
		.where(eq(retenu.recruteurId, locals.user.id));
	return { user: locals.user, retenuIds: rows.map((r) => r.candidatId) };
};
