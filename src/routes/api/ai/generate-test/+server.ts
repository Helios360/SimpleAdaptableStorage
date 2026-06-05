import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateTestQuestions, type TestType } from '$lib/server/ai';

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
	return json(result);
};
