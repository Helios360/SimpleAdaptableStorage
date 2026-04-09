import type { Handle } from '@sveltejs/kit';
import { verifyUserToken } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get('token');

	if (token) {
		const user = verifyUserToken(token);
		if (user) {
			event.locals.user = user;
		} else {
			event.cookies.delete('token', { path: '/' });
		}
	}

	return resolve(event);
};
