import { error, type RequestHandler } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { promo } from '$lib/server/db/schema';
import { streamFile } from '$lib/server/uploads';

/**
 * Calendrier d'une promo (PDF déposé en Paramètres). Accessible sans session :
 * le lien part dans le mail de passation, que l'étudiant ouvre depuis sa boîte
 * sans être connecté (tout le parcours fiche est tokenisé, sans login). Document
 * institutionnel et non nominatif — contrairement aux pièces du dossier, qui
 * restent servies par des routes authentifiées.
 */
export const GET: RequestHandler = async ({ params, url, request }) => {
	const id = Number(params.id);
	if (!Number.isFinite(id)) throw error(400, 'Promo invalide');

	const [row] = await db
		.select({ label: promo.label, path: promo.calendrierPath })
		.from(promo)
		.where(eq(promo.id, id))
		.limit(1);
	if (!row) throw error(404, 'Promo introuvable');
	if (!row.path) throw error(404, 'Aucun calendrier déposé');

	const inline = url.searchParams.get('dl') !== '1';
	return streamFile(row.path, `Calendrier — ${row.label}.pdf`, inline, request.headers.get('range'));
};
