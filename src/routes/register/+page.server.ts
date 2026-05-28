import type { PageServerLoad } from './$types';
import { db } from '$server/db';
import { formations } from '$server/db/schema';

export const load: PageServerLoad = async () => {
  const list = await db
    .select({ id: formations.id, code: formations.code, name: formations.name })
    .from(formations)
    .orderBy(formations.name);
  return { formations: list };
};
