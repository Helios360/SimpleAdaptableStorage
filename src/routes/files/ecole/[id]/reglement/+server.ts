import { error, type RequestHandler } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { school } from '$lib/server/db/schema';
import { streamFile } from '$lib/server/uploads';

/** Règlement intérieur d'une école (PDF déposé en Paramètres). Accessible à tout
 *  utilisateur connecté : le lien part notamment dans le mail de passation. */
export const GET: RequestHandler = async ({ params, locals, url, request }) => {
	if (!locals.user) throw error(401, 'Non autorisé');
	const id = Number(params.id);
	if (!Number.isFinite(id)) throw error(400, 'École invalide');

	const [row] = await db
		.select({ name: school.name, path: school.reglementPath })
		.from(school)
		.where(eq(school.id, id))
		.limit(1);
	if (!row) throw error(404, 'École introuvable');
	if (!row.path) throw error(404, 'Aucun règlement intérieur déposé');

	const inline = url.searchParams.get('dl') !== '1';
	return streamFile(
		row.path,
		`Règlement intérieur — ${row.name}.pdf`,
		inline,
		request.headers.get('range')
	);
};
