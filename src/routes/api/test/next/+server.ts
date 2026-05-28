import { error, json } from '@sveltejs/kit';
import { count, eq, sql } from 'drizzle-orm';
import { requireUser } from '$server/guards';
import { db } from '$server/db';
import { tests, testAttempts } from '$server/db/schema';
import type { RequestHandler } from './$types';

const DEV_LIKE_FORMATIONS = new Set([3, 4]); // dev_web_fs, si_cybersec_expert in the seed order

export const GET: RequestHandler = async (event) => {
  const user = requireUser(event);
  const [{ value }] = await db.select({ value: count() }).from(testAttempts).where(eq(testAttempts.userId, user.id));
  const cnt = Number(value);
  const next = cnt + 1;

  const isDevLike = user.formationId !== null && DEV_LIKE_FORMATIONS.has(user.formationId);
  let servType: number;
  if (isDevLike) {
    if (next > 27) return json({ done: true });
    // alternate type per 3 questions: front (1) → back (2) → psy (3)
    servType = (Math.floor((next - 1) / 3) % 3) + 1;
  } else {
    if (next > 15) return json({ done: true });
    servType = 3; // psychotechnical only
  }

  const row = await db
    .select({
      id: tests.id,
      question: tests.question,
      type: tests.type,
      difficulty: tests.difficulty
    })
    .from(tests)
    .where(eq(tests.type, servType))
    .orderBy(sql`random()`)
    .limit(1);
  if (!row.length) throw error(404, 'No tests available');

  return json({ test: row[0], count: next });
};
