import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { Readable } from 'node:stream';
import { requireUser } from '$server/guards';
import { db } from '$server/db';
import { userProfiles } from '$server/db/schema';
import { FILE_KINDS, fileStream, guessContentType, type FileKind } from '$server/uploads';
import type { RequestHandler } from './$types';

const COLUMN = {
  cv: userProfiles.cv,
  id_doc: userProfiles.idDoc,
  id_doc_verso: userProfiles.idDocVerso
} as const;

export const GET: RequestHandler = async (event) => {
  const user = requireUser(event);
  const kind = event.params.kind as FileKind;
  if (!FILE_KINDS.includes(kind)) throw error(400, 'Invalid kind');

  const [row] = await db
    .select({ stored: COLUMN[kind] })
    .from(userProfiles)
    .where(eq(userProfiles.userId, user.id))
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
