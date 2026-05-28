import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { requireUser } from '$server/guards';
import { db } from '$server/db';
import { formations, userProfiles } from '$server/db/schema';
import { auth } from '$server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const user = requireUser(event);
  const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, user.id));
  if (!profile) throw redirect(303, '/');
  const fList = await db
    .select({ id: formations.id, name: formations.name })
    .from(formations)
    .orderBy(formations.name);
  return { profile, formations: fList };
};

function parseTags(v: FormDataEntryValue | null): string[] {
  if (typeof v !== 'string') return [];
  try {
    const x = JSON.parse(v);
    return Array.isArray(x) ? x.map(String).slice(0, 50) : [];
  } catch {
    return v.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 50);
  }
}

export const actions: Actions = {
  update: async (event) => {
    const user = requireUser(event);
    const fd = await event.request.formData();
    const get = (k: string) => fd.get(k)?.toString().trim() ?? '';
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
      skills: parseTags(fd.get('skills')),
      updatedAt: new Date()
    };
    if (!data.name || !data.fname || !data.city) return fail(400, { message: 'Champs requis manquants' });
    await db.update(userProfiles).set(data).where(eq(userProfiles.userId, user.id));
    return { success: true };
  },
  consent: async (event) => {
    const user = requireUser(event);
    await db
      .update(userProfiles)
      .set({ consent: true, consentedAt: new Date() })
      .where(eq(userProfiles.userId, user.id));
    return { success: true };
  },
  delete: async (event) => {
    const user = requireUser(event);
    // BetterAuth deletes user → cascades to profile via FK in shipped migration.
    await auth.api.deleteUser({ headers: event.request.headers, body: {} as any }).catch(() => null);
    await db.delete(userProfiles).where(eq(userProfiles.userId, user.id));
    throw redirect(303, '/');
  }
};
