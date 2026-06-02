import { error, json } from '@sveltejs/kit';
import path from 'node:path';
import { Readable } from 'node:stream';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '$server/guards';
import { db } from '$server/db';
import { userProfiles } from '$server/db/schema';
import {
  FILE_KINDS,
  type FileKind,
  fileStream,
  guessContentType,
  persistFile,
  removeStored
} from '$server/uploads';
import { watermarkPdf } from '$server/watermark';
import type { RequestHandler } from './$types';

const COLUMN = {
  cv: userProfiles.cv,
  id_doc: userProfiles.idDoc,
  id_doc_verso: userProfiles.idDocVerso,
  video: userProfiles.video
} as const;

function kindOf(s: string): FileKind {
  if (!FILE_KINDS.includes(s as FileKind)) throw error(400, 'Invalid kind');
  return s as FileKind;
}

function colKey(k: FileKind): 'cv' | 'idDoc' | 'idDocVerso' | 'video' {
  if (k === 'cv') return 'cv';
  if (k === 'id_doc') return 'idDoc';
  if (k === 'id_doc_verso') return 'idDocVerso';
  return 'video';
}

export const GET: RequestHandler = async (event) => {
  requireAdmin(event);
  const kind = kindOf(event.params.kind);
  const [row] = await db
    .select({ stored: COLUMN[kind] })
    .from(userProfiles)
    .where(eq(userProfiles.userId, event.params.id))
    .limit(1);
  if (!row?.stored) throw error(404, 'Not found');
  const { abs, stream } = await fileStream(row.stored);
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      'content-type': guessContentType(abs),
      'content-disposition': 'inline',
      'cache-control': 'no-store, no-cache, must-revalidate, private',
      'x-content-type-options': 'nosniff'
    }
  });
};

export const POST: RequestHandler = async (event) => {
  requireAdmin(event);
  const kind = kindOf(event.params.kind);
  const id = event.params.id;
  const fd = await event.request.formData();
  const file = fd.get('file');
  if (!(file instanceof File)) throw error(400, 'No file');

  const [row] = await db.select({ current: COLUMN[kind] }).from(userProfiles).where(eq(userProfiles.userId, id)).limit(1);
  await removeStored(row?.current ?? null);

  let saved;
  try {
    saved = await persistFile(id, kind, file);
  } catch (e: any) {
    throw error(e.status || 400, e.reason || 'invalid_file');
  }
  if (kind === 'cv' && path.extname(saved.abs).toLowerCase() === '.pdf') await watermarkPdf(saved.abs);
  await db.update(userProfiles).set({ [colKey(kind)]: saved.rel }).where(eq(userProfiles.userId, id));
  return json({ success: true, path: saved.rel });
};

export const DELETE: RequestHandler = async (event) => {
  requireAdmin(event);
  const kind = kindOf(event.params.kind);
  const id = event.params.id;
  const [row] = await db.select({ current: COLUMN[kind] }).from(userProfiles).where(eq(userProfiles.userId, id)).limit(1);
  await removeStored(row?.current ?? null);
  await db.update(userProfiles).set({ [colKey(kind)]: null }).where(eq(userProfiles.userId, id));
  return json({ success: true });
};
