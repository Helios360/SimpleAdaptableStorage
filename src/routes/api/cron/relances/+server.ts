import { json, error, type RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { runRelances } from '$lib/server/relance';

/**
 * Déclencheur externe du balayage des relances (cron système, ordonnanceur de
 * l'hébergeur…). Le minuteur interne fait déjà le travail : cet endpoint sert
 * aux déploiements qui préfèrent piloter la cadence eux-mêmes (RELANCE_AUTO=off),
 * et à forcer un passage.
 *
 * Protégé par CRON_SECRET (en-tête `x-cron-key`). Sans secret configuré,
 * l'endpoint reste fermé plutôt qu'ouvert à tous.
 */
export const POST: RequestHandler = async ({ request }) => {
	const secret = env.CRON_SECRET;
	if (!secret) throw error(404, 'Not found');
	if (request.headers.get('x-cron-key') !== secret) throw error(401, 'Non autorisé');

	const report = await runRelances();
	return json({ status: 'ok', ...report });
};
