import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Merged into /candidat/offres (tab "Mes candidatures"). Kept as a redirect so
// existing links/bookmarks don't 404.
export const load: PageServerLoad = async () => {
	throw redirect(308, '/candidat/offres');
};
