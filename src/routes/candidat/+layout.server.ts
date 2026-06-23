import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { requireRole, loadCandidatForUser } from '$lib/server/guards';

export const load: LayoutServerLoad = async ({ locals }) => {
	requireRole(locals.user, 'candidat');
	const candidat = await loadCandidatForUser(locals.user.id);
	if (!candidat) throw redirect(303, '/register/pending');
	return { user: locals.user, candidat };
};
