import type { Handle } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { startRelanceScheduler } from '$lib/server/relance';

// Relance automatique des fiches non soumises (72 h) : le minuteur vit dans le
// processus serveur, aucun cron externe n'est requis. Voir RELANCE_AUTO=off.
startRelanceScheduler();

export const handle: Handle = async ({ event, resolve }) => {
	// Mount better-auth on /api/auth/*
	if (event.url.pathname.startsWith('/api/auth')) {
		return auth.handler(event.request);
	}

	const data = await auth.api.getSession({ headers: event.request.headers });
	event.locals.user = data?.user ?? null;
	event.locals.session = data?.session ?? null;

	return resolve(event);
};
