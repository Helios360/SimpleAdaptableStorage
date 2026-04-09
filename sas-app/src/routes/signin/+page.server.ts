import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import bcrypt from 'bcrypt';
import { eq, sql } from 'drizzle-orm';

import { db } from '$lib/server/db';
import { users, staffSettings, testAttempts } from '$lib/server/db/schema';
import { signUserToken } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) throw redirect(302, '/profile');
};

export const actions: Actions = {
	default: async (event) => {
		const formData = await event.request.formData();
		const email = (formData.get('email')?.toString() ?? '').trim().toLowerCase();
		const password = formData.get('password')?.toString() ?? '';

		if (!email || !password) {
			return fail(400, { message: 'Email ou mot de passe manquant' });
		}

		const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
		if (!user) return fail(401, { message: 'Identifiants non valides' });

		const ok = await bcrypt.compare(password, user.password);
		if (!ok) return fail(401, { message: 'Identifiants non valides' });

		let staff_formations: number[] | null = null;
		if (user.isAdmin) {
			const rows = await db
				.select({ formationId: staffSettings.formationId })
				.from(staffSettings)
				.where(eq(staffSettings.staffUserId, user.id));
			staff_formations = rows.map((r) => Number(r.formationId));
		}

		const [{ testNum }] = await db
			.select({ testNum: sql<number>`count(*)` })
			.from(testAttempts)
			.where(eq(testAttempts.userId, user.id));

		const token = signUserToken({
			id: user.id,
			email: user.email,
			name: user.name,
			fname: user.fname,
			formation_id: user.formationId,
			is_admin: user.isAdmin,
			staff_formations
		});

		event.cookies.set('token', token, {
			path: '/',
			httpOnly: true,
			sameSite: 'strict',
			secure: process.env.NODE_ENV === 'production',
			maxAge: 60 * 60 * 2
		});

		if (user.isAdmin) throw redirect(303, '/admin-panel');

		const threshold = user.formationId === 3 ? 26 : 14;
		if (Number(testNum) <= threshold) throw redirect(303, '/test');

		throw redirect(303, '/profile');
	}
};
