import { error, type RequestHandler } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { candidat } from '$lib/server/db/schema';
import { streamFile } from '$lib/server/uploads';

const SLOTS = ['cv', 'id_recto', 'id_verso', 'pitch'] as const;
type Slot = (typeof SLOTS)[number];

const LABELS: Record<Slot, string> = {
	cv: 'CV',
	id_recto: 'Pièce d\'identité (recto)',
	id_verso: 'Pièce d\'identité (verso)',
	pitch: 'Vidéo pitch'
};

export const GET: RequestHandler = async ({ params, locals, url }) => {
	if (!locals.user) throw error(401, 'Non autorisé');
	const id = Number(params.id);
	const slot = params.slot as Slot;
	if (!Number.isFinite(id) || !SLOTS.includes(slot)) throw error(400, 'Document invalide');

	const rows = await db
		.select({
			ownerId: candidat.userId,
			cvPath: candidat.cvPath,
			idDocPath: candidat.idDocPath,
			idDocVersoPath: candidat.idDocVersoPath,
			pitchPath: candidat.pitchPath
		})
		.from(candidat)
		.where(eq(candidat.id, id))
		.limit(1);

	const row = rows[0];
	if (!row) throw error(404, 'Candidat introuvable');

	const role = (locals.user as { role?: string }).role ?? 'candidat';
	const isOwner = row.ownerId === locals.user.id;
	const isStaff = role === 'cre' || role === 'recruteur';
	if (!isOwner && !isStaff) throw error(403, 'Interdit');

	const path =
		slot === 'cv'
			? row.cvPath
			: slot === 'id_recto'
				? row.idDocPath
				: slot === 'id_verso'
					? row.idDocVersoPath
					: row.pitchPath;
	if (!path) throw error(404, 'Document non déposé');

	const ext = path.split('.').pop() ?? 'bin';
	const inline = url.searchParams.get('dl') !== '1';
	return streamFile(path, `${LABELS[slot]}.${ext}`, inline);
};
