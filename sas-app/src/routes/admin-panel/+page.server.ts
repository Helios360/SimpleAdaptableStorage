import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { and, desc, eq, inArray, like, or, sql } from 'drizzle-orm';

import { db } from '$lib/server/db';
import { formations, testAttempts, users } from '$lib/server/db/schema';
import { deleteUserFolder } from '$lib/server/uploads';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) throw redirect(302, '/signin');
	if (!locals.user.is_admin) throw redirect(302, '/profile');

	const staffFormations = locals.user.staff_formations ?? [];
	const page = Math.max(1, Number(url.searchParams.get('page') || 1));
	const pageSize = Math.min(50, Math.max(5, Number(url.searchParams.get('pageSize') || 10)));
	const q = (url.searchParams.get('q') || '').trim();
	const status = (url.searchParams.get('status') || '').trim();
	const offset = (page - 1) * pageSize;

	const whereParts: any[] = [];

	// StaffSettings defines what this admin can see.
	if (staffFormations.length === 0) {
		whereParts.push(eq(users.id, -1));
	} else {
		whereParts.push(inArray(users.formationId, staffFormations));
	}

	if (q) {
		const needle = `%${q}%`;
		whereParts.push(or(like(users.name, needle), like(users.fname, needle), like(users.email, needle)));
	}
	if (status) whereParts.push(eq(users.status, status as any));

	const where = and(...whereParts);

	const [{ total }] = await db
		.select({ total: sql<number>`count(*)` })
		.from(users)
		.where(where);

	const rows = await db
		.select({
			id: users.id,
			name: users.name,
			fname: users.fname,
			email: users.email,
			city: users.city,
			status: users.status,
			formationId: users.formationId,
			formationName: formations.name,
			createdAt: users.createdAt
		})
		.from(users)
		.leftJoin(formations, eq(users.formationId, formations.id))
		.where(where)
		.orderBy(desc(users.createdAt))
		.limit(pageSize)
		.offset(offset);

	return {
		user: locals.user,
		staffFormations,
		filters: { page, pageSize, q, status },
		pagination: {
			page,
			pageSize,
			total: Number(total),
			totalPages: Math.max(1, Math.ceil(Number(total) / pageSize))
		},
		users: rows
	};
};

export const actions: Actions = {
	deleteUser: async ({ locals, request }) => {
		if (!locals.user) throw redirect(302, '/signin');
		if (!locals.user.is_admin) throw redirect(302, '/profile');

		const staffFormations = locals.user.staff_formations ?? [];
		if (staffFormations.length === 0) return fail(403, { message: 'Aucune formation assignée à cet admin.' });

		const form = await request.formData();
		const id = Number(form.get('id'));
		if (!Number.isFinite(id)) return fail(400, { message: 'Id invalide' });

		const [target] = await db
			.select({ id: users.id, formationId: users.formationId })
			.from(users)
			.where(eq(users.id, id))
			.limit(1);

		if (!target) return fail(404, { message: 'Utilisateur introuvable' });
		if (!staffFormations.includes(Number(target.formationId))) {
			return fail(403, { message: 'Action non autorisée sur cette formation' });
		}

		await deleteUserFolder(id);
		await db.delete(users).where(eq(users.id, id));

		return { message: 'Utilisateur supprimé.' };
	},

	resetTests: async ({ locals, request }) => {
		if (!locals.user) throw redirect(302, '/signin');
		if (!locals.user.is_admin) throw redirect(302, '/profile');

		const staffFormations = locals.user.staff_formations ?? [];
		if (staffFormations.length === 0) return fail(403, { message: 'Aucune formation assignée à cet admin.' });

		const form = await request.formData();
		const id = Number(form.get('id'));
		if (!Number.isFinite(id)) return fail(400, { message: 'Id invalide' });

		const [target] = await db
			.select({ id: users.id, formationId: users.formationId })
			.from(users)
			.where(eq(users.id, id))
			.limit(1);

		if (!target) return fail(404, { message: 'Utilisateur introuvable' });
		if (!staffFormations.includes(Number(target.formationId))) {
			return fail(403, { message: 'Action non autorisée sur cette formation' });
		}

		await db.delete(testAttempts).where(eq(testAttempts.userId, id));
		return { message: 'Tests réinitialisés.' };
	}
};
