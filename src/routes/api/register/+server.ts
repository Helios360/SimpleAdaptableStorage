import { error, json } from '@sveltejs/kit';
import path from 'node:path';
import { env } from '$env/dynamic/private';
import { auth } from '$server/auth';
import { db } from '$server/db';
import { userProfiles } from '$server/db/schema';
import { eq } from 'drizzle-orm';
import { getCityCoords } from '$server/geocode';
import { persistFile, removeStored, FILE_KINDS, type FileKind } from '$server/uploads';
import { watermarkPdf } from '$server/watermark';
import type { RequestHandler } from './$types';

function str(fd: FormData, k: string) {
  const v = fd.get(k);
  return typeof v === 'string' ? v.trim() : '';
}
function bool(fd: FormData, k: string) {
  const v = fd.get(k);
  return v === 'on' || v === 'true' || v === '1';
}

export const POST: RequestHandler = async ({ request }) => {
  const fd = await request.formData();

  const email = str(fd, 'email').toLowerCase();
  const password = str(fd, 'password');
  const name = str(fd, 'name');
  const fname = str(fd, 'fname');
  const tel = str(fd, 'tel');
  const city = str(fd, 'city');
  const birth = str(fd, 'birth');
  const formationId = Number(str(fd, 'formation_id'));
  const consent = bool(fd, 'consent');
  const sejour = bool(fd, 'sejour');
  const titre = str(fd, 'titre');

  if (!email || !password || !name || !fname || !tel || !birth || !city || !consent || !formationId) {
    throw error(400, 'Champs requis manquants');
  }
  if (sejour && !titre) throw error(400, 'Date du titre de séjour requise');

  // BetterAuth creates the user + sends verification email.
  const signed = await auth.api.signUpEmail({
    body: { email, password, name: `${fname} ${name}` },
    asResponse: false
  }).catch((e: any) => {
    if (e?.status === 422 || /already/i.test(String(e?.message))) {
      throw error(409, 'Ce compte existe déjà');
    }
    throw error(500, 'Création impossible');
  });

  const uid = signed.user.id;
  let lon: number | null = null, lat: number | null = null;
  const coords = await getCityCoords(city);
  if (coords) [lon, lat] = coords;

  await db.insert(userProfiles).values({
    userId: uid,
    name, fname, tel, birth,
    addr: str(fd, 'addr') || null,
    city, postal: str(fd, 'postal') || null,
    lon: lon !== null ? String(lon) : null,
    lat: lat !== null ? String(lat) : null,
    permis: bool(fd, 'permis'),
    vehicule: bool(fd, 'vehicule'),
    mobile: bool(fd, 'mobile'),
    consent,
    consentedAt: new Date(),
    termsVersion: Number(env.TOS_VERSION || 1),
    formationId,
    titreValide: sejour && titre ? titre : null
  });

  // Files (optional).
  const stored: Partial<Record<FileKind, string>> = {};
  for (const k of FILE_KINDS) {
    const f = fd.get(k);
    if (!(f instanceof File) || f.size === 0) continue;
    try {
      const { abs, rel } = await persistFile(uid, k, f);
      if (k === 'cv' && path.extname(abs).toLowerCase() === '.pdf') await watermarkPdf(abs);
      stored[k] = rel;
    } catch (e: any) {
      // file rejected — keep registration but report softly
      console.warn(`[register] file ${k} rejected:`, e?.reason || e?.message);
    }
  }

  if (Object.keys(stored).length) {
    await db.update(userProfiles).set({
      cv: stored.cv ?? null,
      idDoc: stored.id_doc ?? null,
      idDocVerso: stored.id_doc_verso ?? null
    }).where(eq(userProfiles.userId, uid));
  }

  // Clean up the session created by signup — user must verify + sign in.
  return json({ success: true });
};
