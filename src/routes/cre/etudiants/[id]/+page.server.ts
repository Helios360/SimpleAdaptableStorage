import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { updateFicheEtudiant, updateFicheEntreprise } from '$lib/server/fiche';
import {
	getCandidatRowById,
	listFormations,
	listCompetences,
	listPromos,
	DEFAULT_TAGS,
	DEFAULT_SKILLS
} from '$lib/server/queries';
import { requireRole } from '$lib/server/guards';
import { candidatActions } from '$lib/server/candidatActions';
import { placementActions } from '$lib/server/placementActions';
import { db } from '$lib/server/db';
import { candidat as candidatTable, formToken, placement, user, school } from '$lib/server/db/schema';
import { asc, desc, eq, inArray } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { sanitizeChecklist, type SchoolType } from '$lib/checklist';
import { keepLatestPerAudience, nextRelanceAt } from '$lib/relanceLogic';
import { promosForSchool } from '$lib/paramsLogic';
import { ecoleForCandidat } from '$lib/server/placement';

// Auteur de la note : un membre CRE, distinct du compte de l'étudiant déjà joint.
const noteAuthor = alias(user, 'note_author');

/** Suivi des liens de formulaire d'un placement : reçu, relancé, prochaine relance. */
export interface SuiviLien {
	audience: string;
	submittedAt: Date | null;
	expiresAt: Date;
	relanceCount: number;
	lastRelanceAt: Date | null;
	nextRelanceAt: Date | null;
}

/** Dernier lien émis par audience, pour chaque placement (clé = id du placement). */
async function suiviLiens(placementIds: number[]): Promise<Record<number, SuiviLien[]>> {
	if (!placementIds.length) return {};
	const rows = await db
		.select({
			placementId: formToken.placementId,
			audience: formToken.audience,
			createdAt: formToken.createdAt,
			expiresAt: formToken.expiresAt,
			submittedAt: formToken.submittedAt,
			lastRelanceAt: formToken.lastRelanceAt,
			relanceCount: formToken.relanceCount
		})
		.from(formToken)
		.where(inArray(formToken.placementId, placementIds));

	const out: Record<number, SuiviLien[]> = {};
	for (const r of keepLatestPerAudience(rows)) {
		(out[r.placementId] ??= []).push({
			audience: r.audience,
			submittedAt: r.submittedAt,
			expiresAt: r.expiresAt,
			relanceCount: r.relanceCount,
			lastRelanceAt: r.lastRelanceAt,
			nextRelanceAt: nextRelanceAt(r)
		});
	}
	return out;
}

export const load: PageServerLoad = async ({ params, locals }) => {
	requireRole(locals.user, 'cre');
	const id = Number(params.id);
	if (!Number.isFinite(id)) throw error(404, 'Étudiant introuvable');

	const [candidat, formations, competences, placements, ficheRow, promos, staff, ecole] = await Promise.all([
		getCandidatRowById(id),
		listFormations(),
		listCompetences(),
		db
			.select()
			.from(placement)
			.where(eq(placement.candidatId, id))
			.orderBy(desc(placement.createdAt)),
		db
			.select({
				ficheInfos: candidatTable.ficheInfos,
				checklist: candidatTable.checklist,
				schoolType: school.type,
				// Note interne partagée par l'équipe CRE + auteur du dernier enregistrement.
				note: candidatTable.note,
				noteUpdatedAt: candidatTable.noteUpdatedAt,
				noteAuthor: noteAuthor.name
			})
			.from(candidatTable)
			.innerJoin(user, eq(candidatTable.userId, user.id))
				.leftJoin(school, eq(user.schoolId, school.id))
				.leftJoin(noteAuthor, eq(candidatTable.noteAuthorId, noteAuthor.id))
			.where(eq(candidatTable.id, id))
			.limit(1),
		// Promos (select de la passation) et membres CRE (« Suivi par »).
		listPromos(),
		db
			.select({ id: user.id, name: user.name })
			.from(user)
			.where(eq(user.role, 'cre'))
			.orderBy(asc(user.name)),
		// École de rattachement (même règle que les mails : la formation d'abord,
		// puis le compte) — elle restreint les promos proposées à la passation.
		ecoleForCandidat(id)
	]);
	if (!candidat) throw error(404, 'Étudiant introuvable');

	// Suivi des liens envoyés (reçu / relancé / prochaine relance automatique).
	const relances = await suiviLiens(placements.map((p) => p.id));

	return {
		candidat,
		relances,
		formations,
		defaultTags: DEFAULT_TAGS,
		defaultSkills: competences.length ? competences : DEFAULT_SKILLS,
		placements,
		// Fiches en JSONB : infos étudiant sur le candidat, fiche entreprise sur le
		// placement le plus récent.
		ficheEtudiant: ficheRow[0]?.ficheInfos ?? null,
		ficheEntreprise: placements[0]?.ficheEntreprise ?? null,
		// Checklist « dossier » + type d'école (déduit de user.school) pour
		// l'affichage conditionnel des items Discord / plateforme e-learning.
		checklist: sanitizeChecklist(ficheRow[0]?.checklist),
		// Note interne (visible et modifiable par tous les CRE, jamais par l'étudiant).
		note: ficheRow[0]?.note ?? '',
		noteAuthor: ficheRow[0]?.noteAuthor ?? null,
		noteUpdatedAt: ficheRow[0]?.noteUpdatedAt ?? null,
		schoolType: (ficheRow[0]?.schoolType as SchoolType | null) ?? 'autre',
		// Données des selects de la fiche de passation. Les promos sont limitées à
		// l'école de l'étudiant : proposer celles des autres écoles n'a pas de sens.
		promos: promosForSchool(promos, ecole.id),
		ecoleName: ecole.name,
		staff,
		// « Source » = Solo ou le nom du commercial connecté.
		currentUserName: locals.user.name
	};
};

export const actions: Actions = {
	setStatut: candidatActions.setStatut,
	updateChecklist: candidatActions.updateChecklist,
	saveNote: candidatActions.saveNote,
	updateCandidat: candidatActions.updateCandidat,
	adminAddCv: candidatActions.adminAddCv,
	adminRemoveCv: candidatActions.adminRemoveCv,
	updateInscriptionDoc: candidatActions.updateInscriptionDoc,
	removeInscriptionDoc: candidatActions.removeInscriptionDoc,
	deleteStudent: candidatActions.deleteStudent,
	sendReset: candidatActions.sendReset,
	createPlacement: placementActions.createPlacement,
	resendPlacementLinks: placementActions.resendPlacementLinks,
	setStatutOpco: placementActions.setStatutOpco,
	setPriseEnCharge: placementActions.setPriseEnCharge,
	// Édition des fiches directement depuis le dossier (côté CRE, sans token).
	updateFicheEtudiant: async ({ request, locals }) => {
		requireRole(locals.user, 'cre');
		const form = await request.formData();
		const candidatId = Number(form.get('candidatId'));
		if (!Number.isFinite(candidatId)) return fail(400, { error: 'Étudiant invalide.' });
		return updateFicheEtudiant(candidatId, form);
	},
	updateFicheEntreprise: async ({ request, locals }) => {
		requireRole(locals.user, 'cre');
		const form = await request.formData();
		const placementId = Number(form.get('placementId'));
		if (!Number.isFinite(placementId)) return fail(400, { error: 'Placement invalide.' });
		return updateFicheEntreprise(placementId, form);
	}
};
