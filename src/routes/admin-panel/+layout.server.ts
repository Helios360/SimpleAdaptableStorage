import { requireAdmin } from '$server/guards';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
  requireAdmin(event);
  return {};
};
