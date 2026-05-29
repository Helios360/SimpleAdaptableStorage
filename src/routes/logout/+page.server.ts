import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { auth } from '$lib/server/auth';

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		try {
			const res = await auth.api.signOut({
				headers: request.headers,
				asResponse: true
			});
			for (const raw of res.headers.getSetCookie()) {
				const head = raw.split(';')[0];
				const eq = head.indexOf('=');
				const name = head.slice(0, eq);
				cookies.delete(name, { path: '/' });
			}
		} catch {
			// ignore — still redirect
		}
		throw redirect(303, '/');
	}
};
