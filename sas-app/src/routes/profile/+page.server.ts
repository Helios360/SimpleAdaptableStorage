import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { eq } from 'drizzle-orm';

import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import {
	deleteStoredFile,
	deleteUserFolder,
	saveUserUpload,
	type UploadKind,
	UPLOAD_KINDS
} from '$lib/server/uploads';
import { makeToken } from '$lib/server/tokens';
import { sendMail } from '$lib/server/mailer';
import { env } from '$env/dynamic/private';

function asString(v: FormDataEntryValue | null) {
	return (v?.toString() ?? '').trim();
}

function assertKind(kind: string): kind is UploadKind {
	return (UPLOAD_KINDS as readonly string[]).includes(kind);
}

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/signin');

	const [user] = await db
		.select({
			id: users.id,
			name: users.name,
			fname: users.fname,
			email: users.email,
			city: users.city,
			postal: users.postal,
			status: users.status,
			createdAt: users.createdAt,
			cv: users.cv,
			idDoc: users.idDoc,
			idDocVerso: users.idDocVerso,
			emailVerified: users.emailVerified
		})
		.from(users)
		.where(eq(users.id, locals.user.id))
		.limit(1);

	if (!user) throw redirect(302, '/signin');

	return { user, sessionUser: locals.user };
};

export const actions: Actions = {
	logout: async ({ cookies }) => {
		cookies.delete('token', { path: '/' });
		throw redirect(303, '/signin');
	},

	sendVerification: async ({ locals }) => {
		if (!locals.user) throw redirect(302, '/signin');

		const [u] = await db
			.select({ email: users.email, emailVerified: users.emailVerified })
			.from(users)
			.where(eq(users.id, locals.user.id))
			.limit(1);

		if (!u) throw redirect(302, '/signin');
		if (u.emailVerified) return { message: 'Email déjà vérifié.' };

		const { token, tokenHash } = makeToken();
		const expires = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h

		await db
			.update(users)
			.set({ emailVerifyToken: tokenHash, emailVerifyExpires: expires })
			.where(eq(users.id, locals.user.id));

		const appUrl = (env.APP_URL || 'http://localhost:5173/').replace(/\/+$/, '/');
		const link = `${appUrl}api/auth/verify-email?token=${token}&email=${encodeURIComponent(u.email)}`;

		await sendMail(
			u.email,
			'Validez votre compte',
			`<h1>Vérification</h1><p>Cliquez ici :</p><a href="${link}">Valider mon compte</a>`
		);

		return { message: 'Email de vérification envoyé (pensez à vérifier vos spams).' };
	},

	uploadDoc: async ({ locals, request }) => {
		if (!locals.user) throw redirect(302, '/signin');

		const form = await request.formData();
		const kindRaw = asString(form.get('kind'));
		const file = form.get('file');

		if (!assertKind(kindRaw)) return fail(400, { message: 'Type de document invalide' });
		if (!(file instanceof File)) return fail(400, { message: 'Fichier manquant' });

		const [current] = await db
			.select({ cv: users.cv, idDoc: users.idDoc, idDocVerso: users.idDocVerso })
			.from(users)
			.where(eq(users.id, locals.user.id))
			.limit(1);

		if (!current) throw redirect(302, '/signin');

		const prevPath =
			kindRaw === 'cv'
				? current.cv
				: kindRaw === 'id_doc'
					? current.idDoc
					: current.idDocVerso;

		try {
			await deleteStoredFile(prevPath);
			const saved = await saveUserUpload({ userId: locals.user.id, kind: kindRaw, file });

			const set: any =
				kindRaw === 'cv'
					? { cv: saved.storedPath }
					: kindRaw === 'id_doc'
						? { idDoc: saved.storedPath }
						: { idDocVerso: saved.storedPath };

			await db.update(users).set(set).where(eq(users.id, locals.user.id));
			return { message: 'Document mis à jour.' };
		} catch (e) {
			console.error('uploadDoc error:', e);
			return fail(400, { message: 'Upload impossible (type/taille invalide ?)' });
		}
	},

	deleteDoc: async ({ locals, request }) => {
		if (!locals.user) throw redirect(302, '/signin');

		const form = await request.formData();
		const kindRaw = asString(form.get('kind'));
		if (!assertKind(kindRaw)) return fail(400, { message: 'Type de document invalide' });

		const [current] = await db
			.select({ cv: users.cv, idDoc: users.idDoc, idDocVerso: users.idDocVerso })
			.from(users)
			.where(eq(users.id, locals.user.id))
			.limit(1);

		if (!current) throw redirect(302, '/signin');

		const prevPath =
			kindRaw === 'cv'
				? current.cv
				: kindRaw === 'id_doc'
					? current.idDoc
					: current.idDocVerso;

		await deleteStoredFile(prevPath);

		const set: any =
			kindRaw === 'cv' ? { cv: null } : kindRaw === 'id_doc' ? { idDoc: null } : { idDocVerso: null };

		await db.update(users).set(set).where(eq(users.id, locals.user.id));
		return { message: 'Document supprimé.' };
	},

	deleteAccount: async ({ locals, cookies }) => {
		if (!locals.user) throw redirect(302, '/signin');

		// DB row delete will cascade test attempts. Files are removed on disk.
		await deleteUserFolder(locals.user.id);
		await db.delete(users).where(eq(users.id, locals.user.id));

		cookies.delete('token', { path: '/' });
		throw redirect(303, '/signin');
	}
};
