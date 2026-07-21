import type { Actions, PageServerLoad } from './$types';
import { requireRole } from '$lib/server/guards';
import {
	listFormationsWithCounts,
	listPromos,
	listAdmins,
	listSchools
} from '$lib/server/queries';
import { paramsActions } from '$lib/server/paramsActions';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals.user, 'cre');
	const [schools, formations, promos, admins] = await Promise.all([
		listSchools(),
		listFormationsWithCounts(),
		listPromos(),
		listAdmins()
	]);
	return { schools, formations, promos, admins, currentUserId: locals.user.id };
};

export const actions: Actions = {
	createFormation: paramsActions.createFormation,
	updateFormation: paramsActions.updateFormation,
	deleteFormation: paramsActions.deleteFormation,
	createPromo: paramsActions.createPromo,
	updatePromo: paramsActions.updatePromo,
	deletePromo: paramsActions.deletePromo,
	createSchool: paramsActions.createSchool,
	updateSchool: paramsActions.updateSchool,
	deleteSchool: paramsActions.deleteSchool
};
