import { json, error } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { cvSuggestions } from '$lib/server/ai';
import { db } from '$lib/server/db';
import { cv } from '$lib/server/db/schema';
import { loadCandidatForUser } from '$lib/server/guards';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, 'Non authentifié');

	const body = (await request.json().catch(() => null)) as {
		cvId?: number;
		content?: string;
		poste?: string;
	} | null;

	const poste = (body?.poste ?? '').trim() || 'poste visé';

	// Le contenu peut venir directement du client, ou être dérivé d'un CV de
	// l'utilisateur (on vérifie alors qu'il lui appartient).
	let content = (body?.content ?? '').trim();
	if (!content && body?.cvId) {
		const c = await loadCandidatForUser(locals.user.id);
		if (!c) throw error(400, 'Profil candidat introuvable');
		const rows = await db
			.select({ name: cv.name, tag: cv.tag })
			.from(cv)
			.where(and(eq(cv.id, Number(body.cvId)), eq(cv.candidatId, c.id)))
			.limit(1);
		if (!rows.length) throw error(404, 'CV introuvable');
		content = `CV "${rows[0].name}"${rows[0].tag ? ` (${rows[0].tag})` : ''}`;
	}
	if (!content) content = 'CV sans contenu textuel fourni';

	const result = await cvSuggestions({ content, poste });
	return json(result);
};
