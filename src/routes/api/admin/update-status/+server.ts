import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '$server/guards';
import { db } from '$server/db';
import { userProfiles } from '$server/db/schema';
import type { RequestHandler } from './$types';

const ALLOWED = new Set(['active', 'recherche', 'entreprise', 'archive']);

export const POST: RequestHandler = async (event) => {
  requireAdmin(event);
  const { id, status } = (await event.request.json()) as { id: string; status: string };
  if (!id || !ALLOWED.has(status)) throw error(400, 'Invalid payload');
  await db
    .update(userProfiles)
    .set({ status: status as any, updatedAt: new Date() })
    .where(eq(userProfiles.userId, id));
  return json({ success: true });
};
