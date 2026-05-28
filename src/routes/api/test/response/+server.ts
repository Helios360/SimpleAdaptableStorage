import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { requireUser } from '$server/guards';
import { db } from '$server/db';
import { tests, testAttempts } from '$server/db/schema';
import { gradeAnswer } from '$server/grader';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
  const user = requireUser(event);
  const { testId, answer } = (await event.request.json()) as { testId: number; answer: string };
  const id = Number(testId);
  if (!Number.isInteger(id)) throw error(400, 'Invalid testId');
  const a = String(answer ?? '').trim();
  if (!a) throw error(400, 'Answer required');

  const [t] = await db
    .select({ question: tests.question, answer: tests.answer })
    .from(tests)
    .where(eq(tests.id, id))
    .limit(1);
  if (!t) throw error(404, 'Test not found');

  const score = await gradeAnswer(t.question, t.answer, a);
  await db.insert(testAttempts).values({
    userId: user.id,
    testId: id,
    response: a.replace(/[\r\n]+/g, ' ').slice(0, 4000),
    score
  });
  return json({ success: true, score });
};
