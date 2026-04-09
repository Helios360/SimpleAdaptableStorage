import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import bcrypt from 'bcrypt';
import { desc, eq } from 'drizzle-orm';

import { db } from '$lib/server/db';
import { formations, users } from '$lib/server/db/schema';
import { sendMail } from '$lib/server/mailer';
import { makeToken } from '$lib/server/tokens';
import { saveUserUpload } from '$lib/server/uploads';
import { signUserToken } from '$lib/server/auth';
import { env } from '$env/dynamic/private';

function asString(v: FormDataEntryValue | null) {
	return (v?.toString() ?? '').trim();
}

function asBool(v: FormDataEntryValue | null) {
	// HTML checkboxes send "on" when checked.
	return v === 'on' || v === 'true' || v === '1';
}

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) throw redirect(302, '/profile');

	const formationsList = await db
		.select({ id: formations.id, code: formations.code, name: formations.name })
		.from(formations)
		.orderBy(formations.id);

	return { formations: formationsList };
};

export const actions: Actions = {
	default: async (event) => {
		const formData = await event.request.formData();

		const formationId = Number(asString(formData.get('formation_id')));
		const name = asString(formData.get('name'));
		const fname = asString(formData.get('fname'));
		const email = asString(formData.get('email')).toLowerCase();
		const tel = asString(formData.get('tel'));
		const addr = asString(formData.get('addr')) || null;
		const city = asString(formData.get('city'));
		const postal = asString(formData.get('postal')) || null;
		const birth = asString(formData.get('birth'));
		const password = asString(formData.get('password'));
		const confirm = asString(formData.get('confirm'));

		const permis = asBool(formData.get('permis'));
		const vehicule = asBool(formData.get('vehicule'));
		const mobile = asBool(formData.get('mobile'));
		const consent = asBool(formData.get('consent'));

		const sejour = asBool(formData.get('sejour'));
		const titreValide = sejour ? (asString(formData.get('titre')) || null) : null;

		const cv = formData.get('cv');
		const idDoc = formData.get('id_doc');
		const idDocVerso = formData.get('id_doc_verso');

		if (!formationId || !name || !fname || !email || !tel || !city || !birth || !password) {
			return fail(400, { message: 'Champs obligatoires manquants' });
		}
		if (password !== confirm) {
			return fail(400, { message: 'Les mots de passe ne correspondent pas' });
		}
		if (!consent) {
			return fail(400, { message: 'Vous devez accepter les conditions d’utilisation' });
		}
		if (sejour && !titreValide) {
			return fail(400, { message: "Date d'invalidité du titre de séjour manquante" });
		}

		if (!(cv instanceof File) || !(idDoc instanceof File) || !(idDocVerso instanceof File)) {
			return fail(400, { message: 'Documents manquants (CV + pièce d’identité recto/verso)' });
		}

		const termsVersion = Number(env.TOS_VERSION || 1);

		const { token: verifyToken, tokenHash: verifyHash } = makeToken();
		const verifyExpires = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h

		let userId: number | null = null;
		try {
			const passwordHash = await bcrypt.hash(password, 12);
			const insertRes = await db.insert(users).values({
				formationId,
				name,
				fname,
				email,
				tel,
				addr,
				city,
				postal,
				birth: new Date(birth),
				titreValide: titreValide ? new Date(titreValide) : null,
				permis,
				vehicule,
				mobile,
				password: passwordHash,
				consent,
				consentedAt: consent ? new Date() : null,
				termsVersion,
				emailVerified: false,
				emailVerifyToken: verifyHash,
				emailVerifyExpires: verifyExpires
			});

			userId = Number((insertRes as unknown as { insertId: number }).insertId);
			if (!userId) {
				// Fallback (should not happen, but keeps the flow working)
				const [row] = await db
					.select({ id: users.id })
					.from(users)
					.where(eq(users.email, email))
					.orderBy(desc(users.id))
					.limit(1);
				userId = row?.id ?? null;
			}

			if (!userId) throw new Error('Could not resolve inserted user id');

			// Save documents under uploads/u_<id>/... and store the relative path in DB.
			const [cvSaved, idSaved, idvSaved] = await Promise.all([
				saveUserUpload({ userId, kind: 'cv', file: cv }),
				saveUserUpload({ userId, kind: 'id_doc', file: idDoc }),
				saveUserUpload({ userId, kind: 'id_doc_verso', file: idDocVerso })
			]);

			await db
				.update(users)
				.set({ cv: cvSaved.storedPath, idDoc: idSaved.storedPath, idDocVerso: idvSaved.storedPath })
				.where(eq(users.id, userId));
		} catch (e: any) {
			if (e?.code === 'ER_DUP_ENTRY' || e?.errno === 1062) {
				return fail(409, { message: 'Ce compte existe déjà' });
			}

			console.error('register error:', e);
			return fail(500, { message: 'Erreur serveur, réessayez' });
		}

		// Send verification email (best effort).
		try {
			const appUrl = (env.APP_URL || 'http://localhost:5173/').replace(/\/+$/, '/');
			const link = `${appUrl}api/auth/verify-email?token=${verifyToken}&email=${encodeURIComponent(email)}`;
			await sendMail(
				email,
				'Validez votre compte',
				`<h1>Bienvenue</h1><p>Pour vérifier votre email :</p><a href="${link}">Valider mon compte</a>`
			);
		} catch (e) {
			console.warn('verify email send failed:', (e as Error).message);
		}

		// Auto-login right away (same flow as the old app).
		const token = signUserToken({
			id: userId!,
			email,
			name,
			fname,
			formation_id: formationId,
			is_admin: false,
			staff_formations: null
		});

		event.cookies.set('token', token, {
			path: '/',
			httpOnly: true,
			sameSite: 'strict',
			secure: process.env.NODE_ENV === 'production',
			maxAge: 60 * 60 * 2
		});

		throw redirect(303, '/test');
	}
};
