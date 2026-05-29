import type { LayoutServerLoad } from './$types';
import { requireRole } from '$lib/server/guards';

export const load: LayoutServerLoad = async ({ locals }) => {
	requireRole(locals.user, 'cre');
	return { user: locals.user };
};
