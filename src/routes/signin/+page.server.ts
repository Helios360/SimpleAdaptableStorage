import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  const next = url.searchParams.get('next');
  throw redirect(308, next ? `/?next=${encodeURIComponent(next)}` : '/');
};
