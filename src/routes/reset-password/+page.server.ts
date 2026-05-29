import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';

export const load: PageServerLoad = async ({ url }) => {
	const token = url.searchParams.get('token') ?? '';
	if (!token) throw redirect(303, '/');
	return { token };
};

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await request.formData();
		const token = String(form.get('token') ?? '');
		const password = String(form.get('password') ?? '');
		const confirm = String(form.get('confirm') ?? '');

		if (!token) return fail(400, { error: 'Lien invalide.' });
		if (password.length < 4) return fail(400, { error: 'Mot de passe trop court (4 caractères min).' });
		if (password !== confirm) return fail(400, { error: 'Les mots de passe ne correspondent pas.' });

		try {
			await auth.api.resetPassword({
				body: { newPassword: password, token } as never
			});
		} catch (e) {
			console.error('resetPassword failed:', e);
			return fail(400, { error: 'Lien expiré ou invalide.' });
		}

		throw redirect(303, '/login/candidat?reset=ok');
	}
};
