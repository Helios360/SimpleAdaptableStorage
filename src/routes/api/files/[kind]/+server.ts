import { error, json } from '@sveltejs/kit';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { requireUser } from '$server/guards';
import { db } from '$server/db';
import { userProfiles } from '$server/db/schema';
import { FILE_KINDS, type FileKind, persistFile, removeStored } from '$server/uploads';
import { watermarkPdf } from '$server/watermark';
import type { RequestHandler } from './$types';

function kindOf(s: string): FileKind {
  if (!FILE_KINDS.includes(s as FileKind)) throw error(400, 'Invalid kind');
  return s as FileKind;
}

const COLUMN = {
  cv: userProfiles.cv,
  id_doc: userProfiles.idDoc,
  id_doc_verso: userProfiles.idDocVerso,
  video: userProfiles.video
} as const;

export const POST: RequestHandler = async (event) => {
  const user = requireUser(event);
  const kind = kindOf(event.params.kind);
  const fd = await event.request.formData();
  const file = fd.get('file');
  if (!(file instanceof File)) throw error(400, 'No file');

  const [row] = await db
    .select({ current: COLUMN[kind] })
    .from(userProfiles)
    .where(eq(userProfiles.userId, user.id))
    .limit(1);
  await removeStored(row?.current ?? null);

  let saved;
  try {
    saved = await persistFile(user.id, kind, file);
  } catch (e: any) {
    throw error(e.status || 400, e.reason || 'invalid_file');
  }
  if (kind === 'cv' && path.extname(saved.abs).toLowerCase() === '.pdf') {
    await watermarkPdf(saved.abs);
  }
  await db
    .update(userProfiles)
    .set({ [kindToColumnKey(kind)]: saved.rel })
    .where(eq(userProfiles.userId, user.id));
  return json({ success: true, path: saved.rel });
};

export const DELETE: RequestHandler = async (event) => {
  const user = requireUser(event);
  const kind = kindOf(event.params.kind);
  const [row] = await db
    .select({ current: COLUMN[kind] })
    .from(userProfiles)
    .where(eq(userProfiles.userId, user.id))
    .limit(1);
  await removeStored(row?.current ?? null);
  await db
    .update(userProfiles)
    .set({ [kindToColumnKey(kind)]: null })
    .where(eq(userProfiles.userId, user.id));
  return json({ success: true });
};

function kindToColumnKey(k: FileKind): 'cv' | 'idDoc' | 'idDocVerso' | 'video' {
  if (k === 'cv') return 'cv';
  if (k === 'id_doc') return 'idDoc';
  if (k === 'id_doc_verso') return 'idDocVerso';
  return 'video';
}
