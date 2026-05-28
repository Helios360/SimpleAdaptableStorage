import { requireAdmin } from '$server/guards';
import { db } from '$server/db';
import { formations } from '$server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  requireAdmin(event);
  const list = await db
    .select({ id: formations.id, code: formations.code, name: formations.name })
    .from(formations)
    .orderBy(formations.name);
  return { formations: list };
};
