import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { requireRole, loadCandidatForUser } from '$lib/server/guards';

// Seule URL accessible aux candidats non encore validés : la page de test IA,
// passage obligatoire avant qu'un CRE puisse valider le dossier.
const PENDING_ALLOWED = new Set(['/candidat/tests']);

export const load: LayoutServerLoad = async ({ locals, url }) => {
	requireRole(locals.user, 'candidat');
	const candidat = await loadCandidatForUser(locals.user.id);
	if (!candidat) throw redirect(303, '/register/pending');

	if (candidat.statut === 'refuse') throw redirect(303, '/register/pending');
	if (candidat.statut !== 'valide' && !PENDING_ALLOWED.has(url.pathname)) {
		throw redirect(303, '/register/pending');
	}

	return { user: locals.user, candidat };
};
