import { error, type RequestHandler } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { formation } from '$lib/server/db/schema';
import { streamFile } from '$lib/server/uploads';

/**
 * Référentiel (plaquette) d'une formation, PDF déposé en Paramètres. Accessible
 * sans session : le lien part dans le mail de passation, que l'étudiant ouvre
 * depuis sa boîte sans être connecté. Document institutionnel et non nominatif,
 * au même titre que le règlement intérieur et le calendrier de promo.
 */
export const GET: RequestHandler = async ({ params, url, request }) => {
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
