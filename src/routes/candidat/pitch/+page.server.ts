import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { Actions } from './$types';
import { db } from '$lib/server/db';
import { candidat } from '$lib/server/db/schema';
import { loadCandidatForUser } from '$lib/server/guards';
import {
	saveUpload,
	validateUpload,
	deleteUpload,
	type FileSlot
} from '$lib/server/uploads';

const PITCH_SLOT: FileSlot = {
	allowed: ['mp4', 'webm', 'mov', 'm4v'],
	maxMB: 100,
	label: 'Vidéo pitch'
};

export const actions: Actions = {
	add: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Non autorisé' });
		const c = await loadCandidatForUser(locals.user.id);
		if (!c) return fail(400, { error: 'Profil candidat introuvable' });

		const form = await request.formData();
		const file = form.get('file') as File | null;

		const err = validateUpload(file, PITCH_SLOT);
		if (err) return fail(400, { error: err });

		if (c.pitchPath) await deleteUpload(c.pitchPath);

		const path = await saveUpload(
			`candidat/${locals.user.id}/pitch`,
			`pitch_${Date.now()}`,
			file as File
		);

		await db
			.update(candidat)
			.set({ pitch: true, pitchPath: path })
			.where(eq(candidat.id, c.id));
		return { success: true };
	},
	remove: async ({ locals }) => {
		if (!locals.user) return fail(401, { error: 'Non autorisé' });
		const c = await loadCandidatForUser(locals.user.id);
		if (!c) return fail(400);

		if (c.pitchPath) await deleteUpload(c.pitchPath);
		await db
			.update(candidat)
			.set({ pitch: false, pitchPath: null })
			.where(eq(candidat.id, c.id));
		return { success: true };
	}
};
