import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { Actions } from './$types';
import { db } from '$lib/server/db';
import { candidat } from '$lib/server/db/schema';
import { loadCandidatForUser } from '$lib/server/guards';
import { consumeAnswers } from '$lib/server/aiTestStore';

export const actions: Actions = {
	submit: async ({ request, locals }) => {
		if (!locals.user) return fail(401);
		const c = await loadCandidatForUser(locals.user.id);
		if (!c) return fail(400);

		// Le score n'est définissable qu'une seule fois : une fois le test passé,
		// il n'est plus modifiable (ni par l'étudiant ni par l'admin).
		if (c.score != null) return fail(409, { error: 'Test déjà passé' });

		const form = await request.formData();
		let userAnswers: unknown;
		try {
			userAnswers = JSON.parse(String(form.get('answers') ?? '[]'));
		} catch {
			return fail(400, { error: 'Réponses invalides' });
		}
		if (!Array.isArray(userAnswers)) return fail(400, { error: 'Réponses invalides' });

		const correctAnswers = consumeAnswers(locals.user.id);
		if (!correctAnswers) {
			return fail(400, { error: 'Session de test expirée — relance le test.' });
		}
		if (userAnswers.length !== correctAnswers.length) {
			return fail(400, { error: 'Nombre de réponses incohérent.' });
		}

		const correct = correctAnswers.reduce(
			(n, a, i) => n + (userAnswers[i] === a ? 1 : 0),
			0
		);
		const score = Math.round((correct / correctAnswers.length) * 100);
		await db.update(candidat).set({ score }).where(eq(candidat.id, c.id));
		return { success: true, score };
	}
};
