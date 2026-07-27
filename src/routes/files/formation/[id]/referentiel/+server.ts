import { error, type RequestHandler } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { formation } from '$lib/server/db/schema';
import { streamFile } from '$lib/server/uploads';

/** Référentiel d'une formation (PDF déposé en Paramètres), pour tout utilisateur
 *  connecté — étudiants comme équipe pédagogique. */
export const GET: RequestHandler = async ({ params, locals, url, request }) => {
	if (!locals.user) throw error(401, 'Non autorisé');
	const id = Number(params.id);
	if (!Number.isFinite(id)) throw error(400, 'Formation invalide');

	const [row] = await db
		.select({ code: formation.code, name: formation.name, path: formation.referentielPath })
		.from(formation)
		.where(eq(formation.id, id))
		.limit(1);
	if (!row) throw error(404, 'Formation introuvable');
	if (!row.path) throw error(404, 'Aucun référentiel déposé');

	const inline = url.searchParams.get('dl') !== '1';
	return streamFile(
		row.path,
		`Référentiel — ${row.code} ${row.name}.pdf`,
		inline,
		request.headers.get('range')
	);
};
