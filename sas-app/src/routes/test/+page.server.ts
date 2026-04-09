import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { eq, sql } from 'drizzle-orm';
import OpenAI from 'openai';

import { db } from '$lib/server/db';
import { testAttempts, tests } from '$lib/server/db/schema';
import { env } from '$env/dynamic/private';

const openai = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;

async function gradeWithOpenAI(params: { question: string; rubric: string; answer: string }) {
	if (!openai) return null;

	const response = await openai.responses.create({
		model: 'gpt-4o-mini',
		input: [
			{
				role: 'system',
				content:
					'You are a strict grader. Return only a numeric score between 0 and 100. No commentary.'
			},
			{
				role: 'user',
				content: `Grade the student's answer and return only a numeric score from 0 to 100 (integer).\n\nQuestion:\n${params.question}\n\nRubric / Correct answer:\n${params.rubric}\n\nStudent answer:\n${params.answer}`
			}
		],
		text: {
			format: {
				type: 'json_schema',
				name: 'score_only',
				schema: {
					type: 'object',
					additionalProperties: false,
					properties: {
						score: { type: 'integer', minimum: 0, maximum: 100 }
					},
					required: ['score']
				},
				strict: true
			}
		}
	});

	const raw = response.output_text;
	try {
		const parsed = JSON.parse(raw);
		if (typeof parsed.score === 'number') return parsed.score;
	} catch {
		// ignore
	}

	const n = Number.parseInt(String(raw).trim(), 10);
	if (Number.isFinite(n)) return Math.max(0, Math.min(100, n));
	return null;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) throw redirect(302, '/signin');

	const formationId = locals.user.formation_id;
	const isDevTrack = formationId === 3 || formationId === 4; // 3 = dev web FS in the old app
	const total = isDevTrack ? 27 : 15;

	const [{ cnt }] = await db
		.select({ cnt: sql<number>`count(*)` })
		.from(testAttempts)
		.where(eq(testAttempts.userId, locals.user.id));

	const done = Number(cnt) >= total;
	if (done) throw redirect(303, '/profile');

	const attemptIndex = Number(cnt) + 1;

	// type: 1=frontend, 2=backend, 3=psycho
	let wantedType = 3;
	if (isDevTrack) {
		const cycleIndex = (attemptIndex - 1) % 27;
		const bucket = Math.floor(cycleIndex / 3);
		wantedType = (bucket % 3) + 1;
	}

	const [next] = await db
		.select({ id: tests.id, question: tests.question, type: tests.type, difficulty: tests.difficulty })
		.from(tests)
		.where(eq(tests.type, wantedType))
		.orderBy(sql`RAND()`)
		.limit(1);

	if (!next) {
		return { user: locals.user, test: null, attemptIndex, total, lastScore: url.searchParams.get('score') };
	}

	return { user: locals.user, test: next, attemptIndex, total, lastScore: url.searchParams.get('score') };
};

export const actions: Actions = {
	submit: async ({ locals, request }) => {
		if (!locals.user) throw redirect(302, '/signin');

		const form = await request.formData();
		const testId = Number(form.get('testId'));
		const answer = (form.get('answer')?.toString() ?? '').trim();

		if (!Number.isFinite(testId) || !answer) {
			return fail(400, { message: 'Réponse vide ou test invalide' });
		}

		const [t] = await db
			.select({ id: tests.id, question: tests.question, rubric: tests.answer })
			.from(tests)
			.where(eq(tests.id, testId))
			.limit(1);

		if (!t) return fail(404, { message: 'Test introuvable' });

		let score: number | null = null;
		try {
			score = await gradeWithOpenAI({ question: t.question, rubric: t.rubric, answer });
		} catch (e) {
			console.warn('OpenAI grading failed:', (e as Error).message);
			score = null;
		}

		await db.insert(testAttempts).values({
			userId: locals.user.id,
			testId: t.id,
			response: answer.replace(/[\r\n]+/g, ' '),
			score
		});

		throw redirect(303, `/test?score=${score ?? ''}`);
	}
};
