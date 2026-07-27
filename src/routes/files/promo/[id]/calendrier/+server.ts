import { error, type RequestHandler } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { promo } from '$lib/server/db/schema';
import { streamFile } from '$lib/server/uploads';

/** Calendrier d'une promo (PDF déposé en Paramètres), pour tout utilisateur connecté. */
export const GET: RequestHandler = async ({ params, locals, url, request }) => {
	if (!locals.user) throw error(401, 'Non autorisé');
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
