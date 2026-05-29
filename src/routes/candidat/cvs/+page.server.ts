import { fail } from '@sveltejs/kit';
import { and, eq, desc } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { cv } from '$lib/server/db/schema';
import { loadCandidatForUser } from '$lib/server/guards';
import {
	saveUpload,
	validateUpload,
	deleteUpload,
	extOf,
	mimeFor,
	type FileSlot
} from '$lib/server/uploads';

const CV_SLOT: FileSlot = { allowed: ['pdf'], maxMB: 5, label: 'CV' };

export const load: PageServerLoad = async ({ parent }) => {
	const { candidat } = await parent();
	if (!candidat) return { cvs: [] };
	const rows = await db
		.select()
		.from(cv)
		.where(eq(cv.candidatId, candidat.id))
		.orderBy(desc(cv.createdAt));
	return { cvs: rows };
};

export const actions: Actions = {
	add: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Non autorisé' });
		const c = await loadCandidatForUser(locals.user.id);
		if (!c) return fail(400, { error: 'Profil candidat introuvable' });

		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const file = form.get('file') as File | null;

		if (!name) return fail(400, { error: 'Nom requis' });
		const err = validateUpload(file, CV_SLOT);
		if (err) return fail(400, { error: err });

		const f = file as File;
		const slug = `${Date.now()}_${name.replace(/[^a-z0-9]+/gi, '-').slice(0, 40) || 'cv'}`;
		const path = await saveUpload(`candidat/${locals.user.id}/cvs`, slug, f);

		await db.insert(cv).values({
			candidatId: c.id,
			name,
			path,
			size: f.size,
			mime: mimeFor(f.name) || (`application/${extOf(f.name)}` || null)
		});
		return { success: true };
	},
	remove: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Non autorisé' });
		const c = await loadCandidatForUser(locals.user.id);
		if (!c) return fail(400);

		const form = await request.formData();
		const id = Number(form.get('id'));
		if (!Number.isFinite(id)) return fail(400);

		const rows = await db
			.select({ path: cv.path })
			.from(cv)
			.where(and(eq(cv.id, id), eq(cv.candidatId, c.id)))
			.limit(1);

		await db.delete(cv).where(and(eq(cv.id, id), eq(cv.candidatId, c.id)));
		if (rows[0]?.path) await deleteUpload(rows[0].path);
		return { success: true };
	}
};
