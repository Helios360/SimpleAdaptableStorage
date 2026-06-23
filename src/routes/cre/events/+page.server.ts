import { fail } from '@sveltejs/kit';
import { desc, eq, or, isNull } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { evenement } from '$lib/server/db/schema';
import { requireRole } from '$lib/server/guards';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals.user, 'cre');
	const school = (locals.user as { school?: string | null }).school ?? null;

	// Événements de l'école du CRE + événements globaux (school null).
	const events = await db
		.select()
		.from(evenement)
		.where(school ? or(eq(evenement.school, school), isNull(evenement.school)) : isNull(evenement.school))
		.orderBy(desc(evenement.date));

	return { events };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		requireRole(locals.user, 'cre');
		const form = await request.formData();
		const titre = String(form.get('titre') ?? '').trim();
		const date = String(form.get('date') ?? '').trim();
		if (!titre || !date) return fail(400, { error: 'Titre et date requis.' });

		await db.insert(evenement).values({
			titre,
			type: String(form.get('type') ?? '').trim() || null,
			date,
			description: String(form.get('description') ?? '').trim() || null,
			online: form.get('online') === 'on' || form.get('online') === 'true',
			school: (locals.user as { school?: string | null }).school ?? null
		});
		return { success: true, created: true };
	}
};
