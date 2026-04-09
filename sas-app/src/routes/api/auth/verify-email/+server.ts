import type { RequestHandler } from './$types';
import { redirect, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { hashToken } from '$lib/server/tokens';

export const GET: RequestHandler = async ({ url, locals }) => {
	const token = (url.searchParams.get('token') || '').trim();
	const email = (url.searchParams.get('email') || '').trim().toLowerCase();
	if (!token || !email) throw error(400, 'Missing params');

	const [u] = await db
		.select({
			id: users.id,
			emailVerifyToken: users.emailVerifyToken,
			emailVerifyExpires: users.emailVerifyExpires
		})
		.from(users)
		.where(eq(users.email, email))
		.limit(1);

	if (u?.emailVerifyToken && u.emailVerifyExpires) {
		const ok = hashToken(token) === u.emailVerifyToken && new Date(u.emailVerifyExpires) > new Date();
		if (ok) {
			await db
				.update(users)
				.set({
					emailVerified: true,
					emailVerifiedAt: new Date(),
					emailVerifyToken: null,
					emailVerifyExpires: null
				})
				.where(eq(users.id, u.id));
		}
	}

	// Keep it simple: go back to the app. If the user is already connected, send them to /profile.
	throw redirect(303, locals.user ? '/profile' : '/signin');
};
