/**
 * Actions liées à la passation d'un étudiant en entreprise (dashboard commercial).
 * Crée le placement rattaché au dossier candidat (candidatId en clé étrangère),
 * puis envoie les liens tokenisés vers les deux formulaires (étudiant + entreprise).
 */
import { fail, type RequestEvent } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { placement } from '$lib/server/db/schema';
import { requireRole } from '$lib/server/guards';
import { sendPlacementLinks } from '$lib/server/placement';
import {
	parseFormStr as strOrNull,
	normalizeContrat,
	normalizeStatutOpco
} from '$lib/placementLogic';

// Champs obligatoires de la passation (tous requis désormais). Libellés pour un
// message d'erreur lisible côté client si l'un manque.
const REQUIRED_FIELDS: [string, string][] = [
	['promo', 'Promo'],
	['source', 'Source'],
	['suiviPar', 'Suivi par'],
	['datePlacement', 'Date de placement'],
	['entreprise', 'Entreprise'],
	['contactNom', 'Contact — Nom'],
	['contactPrenom', 'Contact — Prénom'],
	['contactTel', 'Téléphone'],
	['contactEmail', 'Email entreprise'],
	['typeContrat', 'Type de contrat']
];

/** Le commercial place un étudiant : crée le placement + envoie les 2 liens. */
async function createPlacement({ request, locals }: RequestEvent) {
	requireRole(locals.user, 'cre');
	const form = await request.formData();

	const candidatId = Number(form.get('candidatId'));
	if (!Number.isFinite(candidatId)) return fail(400, { error: 'Étudiant invalide.' });

	// Tous les champs de la fiche de passation sont désormais obligatoires.
	const values: Record<string, string> = {};
	for (const [key, label] of REQUIRED_FIELDS) {
		const v = strOrNull(form.get(key));
		if (!v) return fail(400, { error: `Champ requis : ${label}.` });
		values[key] = v;
	}

	if (!/\S+@\S+\.\S+/.test(values.contactEmail)) {
		return fail(400, { error: 'Email de contact entreprise invalide.' });
	}

	const typeContrat = normalizeContrat(values.typeContrat);
	if (!typeContrat) {
		return fail(400, { error: 'Type de contrat invalide.' });
	}

	const [row] = await db
		.insert(placement)
		.values({
			candidatId,
			commercialId: locals.user.id,
			suiviPar: values.suiviPar,
			promo: values.promo,
			source: values.source,
			datePlacement: values.datePlacement,
			entreprise: values.entreprise,
			contactNom: values.contactNom,
			contactPrenom: values.contactPrenom,
			contactTel: values.contactTel,
			contactEmail: values.contactEmail,
			typeContrat,
			statutOpco: normalizeStatutOpco(form.get('statutOpco')),
			commentaires: strOrNull(form.get('commentaires'))
		})
		.returning({ id: placement.id });

	const notified = await sendPlacementLinks(row.id);

	await db
		.update(placement)
		.set({ statut: 'liens_envoyes', updatedAt: new Date() })
		.where(eq(placement.id, row.id));

	return { placementId: row.id, notified };
}

/** Renvoie les liens tokenisés (nouveaux tokens) pour un placement existant. */
async function resendPlacementLinks({ request, locals }: RequestEvent) {
	requireRole(locals.user, 'cre');
	const form = await request.formData();
	const placementId = Number(form.get('placementId'));
	if (!Number.isFinite(placementId)) return fail(400, { error: 'Placement invalide.' });
	const notified = await sendPlacementLinks(placementId);
	return { notified };
}

/** Met à jour le statut OPCO d'un placement (colonne « Statut » du suivi). */
async function setStatutOpco({ request, locals }: RequestEvent) {
	requireRole(locals.user, 'cre');
	const form = await request.formData();
	const placementId = Number(form.get('placementId'));
	if (!Number.isFinite(placementId)) return fail(400, { error: 'Placement invalide.' });
	const statutOpco = normalizeStatutOpco(form.get('statutOpco'));
	await db
		.update(placement)
		.set({ statutOpco, updatedAt: new Date() })
		.where(eq(placement.id, placementId));
	return { ok: true, statutOpco };
}

export const placementActions = {
	createPlacement,
	resendPlacementLinks,
	setStatutOpco
};
