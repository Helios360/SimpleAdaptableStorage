import { error, type RequestHandler } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { candidat, cv } from '$lib/server/db/schema';
import { streamFile } from '$lib/server/uploads';

export const GET: RequestHandler = async ({ params, locals, url }) => {
	if (!locals.user) throw error(401, 'Non autorisé');
	const id = Number(params.id);
	if (!Number.isFinite(id)) throw error(400, 'CV invalide');

	const rows = await db
		.select({
			id: cv.id,
			name: cv.name,
			path: cv.path,
			candidatId: cv.candidatId,
			ownerId: candidat.userId
		})
		.from(cv)
		.innerJoin(candidat, eq(candidat.id, cv.candidatId))
		.where(eq(cv.id, id))
		.limit(1);

	const row = rows[0];
	if (!row || !row.path) throw error(404, 'CV introuvable');

	const role = (locals.user as { role?: string }).role ?? 'candidat';
	const isOwner = row.ownerId === locals.user.id;
	const isStaff = role === 'cre' || role === 'recruteur';
	if (!isOwner && !isStaff) throw error(403, 'Interdit');

	const inline = url.searchParams.get('dl') !== '1';
	return streamFile(row.path, row.name, inline);
};
