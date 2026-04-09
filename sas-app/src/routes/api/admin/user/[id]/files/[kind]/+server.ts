import type { RequestHandler } from './$types';
import { redirect, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import fs from 'node:fs';
import { Readable } from 'node:stream';

import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { guessContentType, toAbsFromStored, type UploadKind, UPLOAD_KINDS } from '$lib/server/uploads';

function assertKind(kind: string): kind is UploadKind {
	return (UPLOAD_KINDS as readonly string[]).includes(kind);
}

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) throw redirect(302, '/signin');
	if (!locals.user.is_admin) throw redirect(302, '/profile');

	const userId = Number(params.id);
	if (!Number.isFinite(userId)) throw error(400, 'Invalid id');

	const kindRaw = String(params.kind || '').trim();
	if (!assertKind(kindRaw)) throw error(400, 'Invalid kind');

	const [row] = await db
		.select({ cv: users.cv, idDoc: users.idDoc, idDocVerso: users.idDocVerso })
		.from(users)
		.where(eq(users.id, userId))
		.limit(1);

	if (!row) throw error(404, 'Not found');

	const storedPath = kindRaw === 'cv' ? row.cv : kindRaw === 'id_doc' ? row.idDoc : row.idDocVerso;
	if (!storedPath) throw error(404, 'Not found');

	const abs = toAbsFromStored(storedPath);
	await fs.promises.access(abs, fs.constants.R_OK).catch(() => {
		throw error(404, 'Not found');
	});

	const stream = fs.createReadStream(abs);
	return new Response(Readable.toWeb(stream) as any, {
		headers: {
			'content-type': guessContentType(abs),
			'content-disposition': 'inline',
			'cache-control': 'no-store, no-cache, must-revalidate, private',
			pragma: 'no-cache'
		}
	});
};
