import { fail, redirect } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { candidat } from '$lib/server/db/schema';
import { requireRole } from '$lib/server/guards';
import {
	getCandidatRowForUser,
	listFormations,
	DEFAULT_SKILLS
} from '$lib/server/queries';
import { updateInscriptionDocFor, removeInscriptionDocFor } from '$lib/server/inscription';
import { deleteCandidatForUser } from '$lib/server/deletion';

function parseJsonArray(raw: unknown): string[] {
	if (typeof raw !== 'string' || !raw) return [];
	try {
		const v = JSON.parse(raw);
		return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
	} catch {
		return [];
	}
}
function strOrNull(raw: unknown): string | null {
	const s = String(raw ?? '').trim();
	return s ? s : null;
}
function intOrNull(raw: unknown): number | null {
	const s = String(raw ?? '').trim();
	if (!s) return null;
	const n = Number(s);
	return Number.isFinite(n) ? n : null;
}

const VALID_RECHERCHE = new Set(['active', 'recherche', 'entreprise', 'archive']);

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals.user, 'candidat');
	const [profile, formations] = await Promise.all([
		getCandidatRowForUser(locals.user.id),
		listFormations()
	]);
	return {
		profile,
		formations,
		defaultSkills: DEFAULT_SKILLS
	};
};

export const actions: Actions = {
	updateMyProfile: async ({ request, locals }) => {
		requireRole(locals.user, 'candidat');
		const form = await request.formData();
		const id = Number(form.get('id'));
		if (!Number.isFinite(id)) return fail(400, { error: 'ID invalide' });

		const lname = String(form.get('lname') ?? '').trim();
		const fname = String(form.get('fname') ?? '').trim();
		if (!lname || !fname) return fail(400, { error: 'Nom et prénom requis' });

		const rechercheStatut = String(form.get('rechercheStatut') ?? '');
		const updates: Partial<typeof candidat.$inferInsert> = {
			lname,
			fname,
			tel: strOrNull(form.get('tel')),
			addr: strOrNull(form.get('addr')),
			city: String(form.get('city') ?? '').trim(),
			postal: strOrNull(form.get('postal')),
			birth: strOrNull(form.get('birth')),
			formationId: intOrNull(form.get('formationId')),
			year: intOrNull(form.get('year')),
			score: intOrNull(form.get('score')),
			tosa: intOrNull(form.get('tosa')),
			permis: form.get('permis') === '1',
			vehicule: form.get('vehicule') === '1',
			mobile: form.get('mobile') === '1',
			skills: parseJsonArray(form.get('skills')),
			titreValide: strOrNull(form.get('titreValide')),
			updatedAt: new Date()
		};
		if (VALID_RECHERCHE.has(rechercheStatut)) updates.rechercheStatut = rechercheStatut;

		const res = await db
			.update(candidat)
			.set(updates)
			.where(and(eq(candidat.id, id), eq(candidat.userId, locals.user.id)))
			.returning({ id: candidat.id });
		if (!res.length) return fail(403, { error: 'Non autorisé' });
		return { success: true };
	},
	updateInscriptionDoc: async ({ request, locals }) => {
		requireRole(locals.user, 'candidat');
		return updateInscriptionDocFor(await request.formData(), locals.user.id);
	},
	removeInscriptionDoc: async ({ request, locals }) => {
		requireRole(locals.user, 'candidat');
		return removeInscriptionDocFor(await request.formData(), locals.user.id);
	},
	deleteAccount: async ({ request, cookies, locals }) => {
		requireRole(locals.user, 'candidat');
		// Sign-out first so the session cookie is invalidated client-side;
		// the session DB row is also wiped by the user-delete cascade below.
		try {
			const res = await auth.api.signOut({ headers: request.headers, asResponse: true });
			for (const raw of res.headers.getSetCookie()) {
				const head = raw.split(';')[0];
				const eq = head.indexOf('=');
				const name = head.slice(0, eq);
				cookies.delete(name, { path: '/' });
			}
		} catch {
			// signOut failure shouldn't block the actual deletion.
		}
		await deleteCandidatForUser(locals.user.id);
		throw redirect(303, '/');
	}
};
