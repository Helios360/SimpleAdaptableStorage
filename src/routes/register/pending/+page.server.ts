import { redirect } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(303, '/login/candidat');

	const role = (locals.user as { role?: string }).role ?? 'candidat';
	if (role !== 'candidat') throw redirect(303, `/${role}`);

	const rows = await db.execute<{ statut: string; score: number | null }>(
		sql`SELECT statut, score FROM candidat WHERE user_id = ${locals.user.id} LIMIT 1`
	);
	const statut = rows[0]?.statut ?? 'en_attente';
	const score = rows[0]?.score ?? null;

	if (statut === 'valide') throw redirect(303, '/candidat');

	return {
		statut,
		score,
		email: (locals.user as { email: string }).email,
		name: (locals.user as { name: string }).name
	};
};
