import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { Actions } from './$types';
import { db } from '$lib/server/db';
import { candidat } from '$lib/server/db/schema';
import { loadCandidatForUser } from '$lib/server/guards';

export const actions: Actions = {
	submit: async ({ request, locals }) => {
		if (!locals.user) return fail(401);
		const c = await loadCandidatForUser(locals.user.id);
		if (!c) return fail(400);

		// Le score n'est définissable qu'une seule fois : une fois le test passé,
		// il n'est plus modifiable (ni par l'étudiant ni par l'admin).
		if (c.score != null) return fail(409, { error: 'Test déjà passé' });

		const form = await request.formData();
		const score = Number(form.get('score'));
		if (!Number.isFinite(score) || score < 0 || score > 100) return fail(400);
		await db.update(candidat).set({ score }).where(eq(candidat.id, c.id));
		return { success: true, score };
	}
};
