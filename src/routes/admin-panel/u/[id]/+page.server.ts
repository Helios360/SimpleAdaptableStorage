import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '$server/guards';
import { db } from '$server/db';
import { formations, user, userProfiles, testAttempts } from '$server/db/schema';
import { removeStored, removeUserDir } from '$server/uploads';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  requireAdmin(event);
  const [row] = await db
    .select({
      profile: userProfiles,
      email: user.email,
      formationName: formations.name
    })
    .from(userProfiles)
    .innerJoin(user, eq(user.id, userProfiles.userId))
    .leftJoin(formations, eq(formations.id, userProfiles.formationId))
    .where(eq(userProfiles.userId, event.params.id))
    .limit(1);
  if (!row) throw error(404, 'Candidat introuvable');
  return { ...row };
};

function parseTags(v: FormDataEntryValue | null): string[] {
  if (typeof v !== 'string') return [];
  try {
    const x = JSON.parse(v);
    return Array.isArray(x) ? x.map(String) : [];
  } catch {
    return [];
  }
}

export const actions: Actions = {
  update: async (event) => {
    requireAdmin(event);
    const fd = await event.request.formData();
    const id = event.params.id;
    const get = (k: string) => fd.get(k)?.toString().trim() ?? '';

    const yearStr = get('year');
    const data = {
      name: get('name'),
      fname: get('fname'),
      tel: get('tel'),
      addr: get('addr') || null,
      city: get('city'),
      postal: get('postal') || null,
      birth: get('birth') || null,
      permis: !!fd.get('permis'),
      vehicule: !!fd.get('vehicule'),
      mobile: !!fd.get('mobile'),
      tags: parseTags(fd.get('tags')),
      skills: parseTags(fd.get('skills')),
      status: (get('status') || 'recherche') as any,
      year: yearStr ? Number(yearStr) : null,
      updatedAt: new Date()
    };
    if (!data.name || !data.fname || !data.city) return fail(400, { message: 'Champs requis manquants' });
    await db.update(userProfiles).set(data).where(eq(userProfiles.userId, id));
    return { success: true };
  },

  resetTests: async (event) => {
    requireAdmin(event);
    await db.delete(testAttempts).where(eq(testAttempts.userId, event.params.id));
    return { success: true };
  },

  delete: async (event) => {
    requireAdmin(event);
    const id = event.params.id;
    const [row] = await db.select().from(userProfiles).where(eq(userProfiles.userId, id)).limit(1);
    if (row) {
      await Promise.all([removeStored(row.cv), removeStored(row.idDoc), removeStored(row.idDocVerso)]);
      await removeUserDir(id);
    }
    await db.delete(userProfiles).where(eq(userProfiles.userId, id));
    await db.delete(user).where(eq(user.id, id));
    throw redirect(303, '/admin-panel');
  }
};
