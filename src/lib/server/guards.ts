import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { candidat, formation } from './db/schema';
import type { User } from './auth';

export type Role = 'candidat' | 'cre' | 'recruteur';

export function requireRole(
	user: User | null,
	role: Role
): asserts user is User & { role: Role } {
	if (!user) throw redirect(303, '/');
	if ((user as { role?: string }).role !== role) {
		const userRole = (user as { role?: string }).role ?? 'candidat';
		throw redirect(303, `/${userRole}`);
	}
}

export async function loadCandidatForUser(userId: string) {
	const rows = await db
		.select({
			id: candidat.id,
			userId: candidat.userId,
			lname: candidat.lname,
			fname: candidat.fname,
			city: candidat.city,
			postal: candidat.postal,
			formationId: candidat.formationId,
			formation: formation.name,
			formationCode: formation.code,
			year: candidat.year,
			score: candidat.score,
			pitch: candidat.pitch,
			pitchPath: candidat.pitchPath,
			statut: candidat.statut,
			rechercheStatut: candidat.rechercheStatut,
			createdAt: candidat.createdAt
		})
		.from(candidat)
		.leftJoin(formation, eq(candidat.formationId, formation.id))
		.where(eq(candidat.userId, userId))
		.limit(1);
	return rows[0] ?? null;
}
