import { fail } from '@sveltejs/kit';
import { and, eq, desc } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { candidat, cv } from '$lib/server/db/schema';
import { loadCandidatForUser } from '$lib/server/guards';
import { updateInscriptionDocFor, removeInscriptionDocFor } from '$lib/server/inscription';
import {
	saveUpload,
	validateUpload,
	deleteUpload,
	extOf,
	mimeFor,
	PITCH_SLOT,
	type FileSlot
} from '$lib/server/uploads';

// Library CVs (the `cv` table) — distinct from the single inscription CV slot.
const CV_SLOT: FileSlot = { allowed: ['pdf'], maxMB: 5, label: 'CV' };

// Tags/types de CV proposés (cf. cahier des charges).
const CV_TAGS = ['Alternance', 'Stage', 'CDI', 'CDD', 'Freelance', 'International'];

export const load: PageServerLoad = async ({ locals }) => {
	const rows = await db
		.select({
			id: candidat.id,
			cvPath: candidat.cvPath,
			idDocPath: candidat.idDocPath,
			idDocVersoPath: candidat.idDocVersoPath,
			pitchPath: candidat.pitchPath
		})
		.from(candidat)
		.where(eq(candidat.userId, locals.user!.id))
		.limit(1);

	const c = rows[0];
	if (!c) {
		return {
			candidatId: null,
			cvs: [],
			cvTags: CV_TAGS,
			docs: { cv: null, id_recto: null, id_verso: null },
			pitchPath: null
		};
	}

	const cvs = await db
		.select()
		.from(cv)
		.where(eq(cv.candidatId, c.id))
		.orderBy(desc(cv.createdAt));

	return {
		candidatId: c.id,
		cvs,
		cvTags: CV_TAGS,
		docs: { cv: c.cvPath, id_recto: c.idDocPath, id_verso: c.idDocVersoPath },
		pitchPath: c.pitchPath
	};
};

export const actions: Actions = {
	// ── CV library (cv table) ────────────────────────────────────────────────
	cvAdd: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Non autorisé' });
		const c = await loadCandidatForUser(locals.user.id);
		if (!c) return fail(400, { error: 'Profil candidat introuvable' });

		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const tagRaw = String(form.get('tag') ?? '').trim();
		const tag = CV_TAGS.includes(tagRaw) ? tagRaw : null;
		const file = form.get('file') as File | null;

		if (!name) return fail(400, { error: 'Nom requis' });
		const err = validateUpload(file, CV_SLOT);
		if (err) return fail(400, { error: err });

		const f = file as File;
		const slug = `${Date.now()}_${name.replace(/[^a-z0-9]+/gi, '-').slice(0, 40) || 'cv'}`;
		const path = await saveUpload(`candidat/${locals.user.id}/cvs`, slug, f);

		// Premier CV de la bibliothèque → actif par défaut.
		const existing = await db.select({ id: cv.id }).from(cv).where(eq(cv.candidatId, c.id));
		const active = existing.length === 0;

		await db.insert(cv).values({
			candidatId: c.id,
			name,
			tag,
			active,
			path,
			size: f.size,
			mime: mimeFor(f.name) || `application/${extOf(f.name)}` || null
		});
		return { success: true };
	},
	cvActivate: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Non autorisé' });
		const c = await loadCandidatForUser(locals.user.id);
		if (!c) return fail(400);

		const form = await request.formData();
		const id = Number(form.get('id'));
		if (!Number.isFinite(id)) return fail(400);

		// Un seul CV actif à la fois : on désactive tous les autres puis on active
		// celui demandé, le tout dans une transaction.
		await db.transaction(async (tx) => {
			await tx.update(cv).set({ active: false }).where(eq(cv.candidatId, c.id));
			await tx
				.update(cv)
				.set({ active: true })
				.where(and(eq(cv.id, id), eq(cv.candidatId, c.id)));
		});
		return { success: true };
	},
	cvRemove: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Non autorisé' });
		const c = await loadCandidatForUser(locals.user.id);
		if (!c) return fail(400);

		const form = await request.formData();
		const id = Number(form.get('id'));
		if (!Number.isFinite(id)) return fail(400);

		const rows = await db
			.select({ path: cv.path, active: cv.active })
			.from(cv)
			.where(and(eq(cv.id, id), eq(cv.candidatId, c.id)))
			.limit(1);

		await db.delete(cv).where(and(eq(cv.id, id), eq(cv.candidatId, c.id)));
		if (rows[0]?.path) await deleteUpload(rows[0].path);

		// Si on a supprimé le CV actif, on promeut le plus récent restant.
		if (rows[0]?.active) {
			const remaining = await db
				.select({ id: cv.id })
				.from(cv)
				.where(eq(cv.candidatId, c.id))
				.orderBy(desc(cv.createdAt))
				.limit(1);
			if (remaining[0]) {
				await db.update(cv).set({ active: true }).where(eq(cv.id, remaining[0].id));
			}
		}
		return { success: true };
	},

	// ── Inscription documents (cv / id_recto / id_verso) ──────────────────────
	docUpload: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Non autorisé' });
		return updateInscriptionDocFor(await request.formData(), locals.user.id);
	},
	docRemove: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Non autorisé' });
		return removeInscriptionDocFor(await request.formData(), locals.user.id);
	},

	// ── Pitch video ───────────────────────────────────────────────────────────
	pitchUpload: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Non autorisé' });
		const c = await loadCandidatForUser(locals.user.id);
		if (!c) return fail(400, { error: 'Profil candidat introuvable' });

		const form = await request.formData();
		const file = form.get('file') as File | null;
		const err = validateUpload(file, PITCH_SLOT);
		if (err) return fail(400, { error: err });

		const path = await saveUpload(`candidat/${locals.user.id}`, 'pitch', file as File);
		// A new upload with a different extension leaves the previous file
		// orphaned (filename is always `pitch.<ext>`) — clean it up.
		if (c.pitchPath && c.pitchPath !== path) await deleteUpload(c.pitchPath);

		await db.update(candidat).set({ pitchPath: path, pitch: true }).where(eq(candidat.id, c.id));
		return { success: true };
	},
	pitchRemove: async ({ locals }) => {
		if (!locals.user) return fail(401, { error: 'Non autorisé' });
		const c = await loadCandidatForUser(locals.user.id);
		if (!c) return fail(400, { error: 'Profil candidat introuvable' });

		if (c.pitchPath) await deleteUpload(c.pitchPath);
		await db.update(candidat).set({ pitchPath: null, pitch: false }).where(eq(candidat.id, c.id));
		return { success: true };
	}
};
