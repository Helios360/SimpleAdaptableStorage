import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { makeToken, hashToken } from '$lib/server/tokens';
import { sendMail } from '$lib/server/mailer';
import { env } from '$env/dynamic/private';

function asString(v: FormDataEntryValue | null) {
	return (v?.toString() ?? '').trim();
}

export const load: PageServerLoad = async ({ url, locals }) => {
	if (locals.user) throw redirect(302, '/profile');

	return {
		email: url.searchParams.get('email') || '',
		token: url.searchParams.get('token') || ''
	};
};

export const actions: Actions = {
	request: async ({ request }) => {
		const form = await request.formData();
		const email = asString(form.get('email')).toLowerCase();
		if (!email) return fail(400, { message: 'Email manquant' });

		// Always respond with success (prevents account enumeration).
		const [u] = await db
			.select({ id: users.id, email: users.email })
			.from(users)
			.where(eq(users.email, email))
			.limit(1);

		if (u) {
			const { token, tokenHash } = makeToken();
			const expires = new Date(Date.now() + 1000 * 60 * 60); // 1h

			await db
				.update(users)
				.set({ resetPwdToken: tokenHash, resetPwdExpires: expires })
				.where(eq(users.id, u.id));

			const appUrl = (env.APP_URL || 'http://localhost:5173/').replace(/\/+$/, '/');
			const link = `${appUrl}reset-password?token=${token}&email=${encodeURIComponent(email)}`;
			try {
				await sendMail(
					email,
					'Réinitialisation de mot de passe',
					`<h1>Réinitialisation</h1><p>Lien valable 1h :</p><a href="${link}">Réinitialiser</a>`
				);
			} catch (e) {
				console.warn('reset mail send failed:', (e as Error).message);
			}
		}

		return {
			message: "Si l'email existe, un lien de réinitialisation a été envoyé (pensez à vérifier vos spams)."
		};
	},

	confirm: async ({ request }) => {
		const form = await request.formData();
		const email = asString(form.get('email')).toLowerCase();
		const token = asString(form.get('token'));
		const password = asString(form.get('password'));
		if (!email || !token || !password) return fail(400, { message: 'Informations manquantes' });

		const [u] = await db
			.select({
				id: users.id,
				resetPwdToken: users.resetPwdToken,
				resetPwdExpires: users.resetPwdExpires
			})
			.from(users)
			.where(eq(users.email, email))
			.limit(1);

		if (!u || !u.resetPwdToken || !u.resetPwdExpires) {
			return fail(403, { message: 'Lien invalide ou expiré' });
		}

		const ok = hashToken(token) === u.resetPwdToken && new Date(u.resetPwdExpires) > new Date();
		if (!ok) return fail(403, { message: 'Lien invalide ou expiré' });

		const passwordHash = await bcrypt.hash(password, 12);
		await db
			.update(users)
			.set({ password: passwordHash, resetPwdToken: null, resetPwdExpires: null })
			.where(eq(users.id, u.id));

		throw redirect(303, '/signin');
	}
};
