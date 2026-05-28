import { requireUser } from '$server/guards';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  requireUser(event);
  return {};
};
