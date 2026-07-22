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
import { candidat as candidatTable, placement, user, school } from '$lib/server/db/schema';
import { asc, desc, eq } from 'drizzle-orm';
import { sanitizeChecklist, type SchoolType } from '$lib/checklist';

export const load: PageServerLoad = async ({ params, locals }) => {
	requireRole(locals.user, 'cre');
	const id = Number(params.id);
	if (!Number.isFinite(id)) throw error(404, 'Étudiant introuvable');

	const [candidat, formations, competences, placements, ficheRow, promos, staff] = await Promise.all([
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
				schoolType: school.type
			})
			.from(candidatTable)
			.innerJoin(user, eq(candidatTable.userId, user.id))
				.leftJoin(school, eq(user.schoolId, school.id))
			.where(eq(candidatTable.id, id))
			.limit(1),
		// Promos (select de la passation) et membres CRE (« Suivi par »).
		listPromos(),
		db
			.select({ id: user.id, name: user.name })
			.from(user)
			.where(eq(user.role, 'cre'))
			.orderBy(asc(user.name))
	]);
	if (!candidat) throw error(404, 'Étudiant introuvable');

	return {
		candidat,
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
		schoolType: (ficheRow[0]?.schoolType as SchoolType | null) ?? 'autre',
		// Données des selects de la fiche de passation.
		promos,
		staff,
		// « Source » = Solo ou le nom du commercial connecté.
		currentUserName: locals.user.name
	};
};

export const actions: Actions = {
	setStatut: candidatActions.setStatut,
	updateChecklist: candidatActions.updateChecklist,
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
