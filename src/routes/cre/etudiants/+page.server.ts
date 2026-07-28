import type { Actions, PageServerLoad } from './$types';
import {
	searchCandidats,
	listFormations,
	listStaffFormations,
	listCompetences,
	listPromos,
	listAdmins,
	DEFAULT_TAGS,
	DEFAULT_SKILLS
} from '$lib/server/queries';
import { candidatActions } from '$lib/server/candidatActions';
import { placementActions } from '$lib/server/placementActions';

export const load: PageServerLoad = async ({ locals }) => {
	const [formations, staffFormationIds, competences, initial, promos, staff] = await Promise.all([
		listFormations(),
		locals.user ? listStaffFormations(locals.user.id) : Promise.resolve([] as number[]),
		listCompetences(),
		searchCandidats({}, { page: 1, pageSize: 10, sortBy: 'createdAt', sortDir: 'desc' }),
		// Référentiels des filtres de l'onglet « Placés » (promo / CRE).
		listPromos(),
		listAdmins()
	]);
	return {
		formations,
		staffFormationIds,
		defaultTags: DEFAULT_TAGS,
		defaultSkills: competences.length ? competences : DEFAULT_SKILLS,
		initial,
		promos,
		staff
	};
};

export const actions: Actions = {
	setStatut: candidatActions.setStatut,
	setRechercheStatut: candidatActions.setRechercheStatut,
	addStudent: candidatActions.addStudent,
	updateCandidat: candidatActions.updateCandidat,
	adminAddCv: candidatActions.adminAddCv,
	adminRemoveCv: candidatActions.adminRemoveCv,
	updateInscriptionDoc: candidatActions.updateInscriptionDoc,
	removeInscriptionDoc: candidatActions.removeInscriptionDoc,
	deleteStudent: candidatActions.deleteStudent,
	sendReset: candidatActions.sendReset,
	setStatutOpco: placementActions.setStatutOpco
};
