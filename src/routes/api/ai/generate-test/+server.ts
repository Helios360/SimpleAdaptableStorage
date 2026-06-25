import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateTestQuestions, type TestType } from '$lib/server/ai';
import { rememberAnswers } from '$lib/server/aiTestStore';

const VALID: TestType[] = ['code', 'logique', 'psycho', 'culture'];

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, 'Non authentifié');

	const body = (await request.json().catch(() => null)) as {
		type?: string;
		poste?: string;
		niveau?: string;
	} | null;

	const type = (body?.type ?? 'code') as TestType;
	const poste = (body?.poste ?? '').trim() || 'poste généraliste';
	if (!VALID.includes(type)) throw error(400, 'Type de test invalide');

	const result = await generateTestQuestions({ type, poste, niveau: body?.niveau });

	// On retient les bonnes réponses côté serveur et on les retire du payload
	// envoyé au client — sans ça, le score peut être trivialement falsifié.
	rememberAnswers(locals.user.id, result.questions.map((q) => q.answer));
	const publicQuestions = result.questions.map(({ q, options }) => ({ q, options }));

	return json({ questions: publicQuestions, fallback: result.fallback });
};
