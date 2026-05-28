import { error, redirect, type RequestEvent } from '@sveltejs/kit';

export function requireUser(event: RequestEvent) {
  if (!event.locals.user) {
    if (event.request.headers.get('accept')?.includes('text/html')) {
      throw redirect(303, `/?next=${encodeURIComponent(event.url.pathname)}`);
    }
    throw error(401, 'Unauthorized');
  }
  return event.locals.user;
}

export function requireAdmin(event: RequestEvent) {
  const user = requireUser(event);
  if (!user.isAdmin) throw error(403, 'Forbidden');
  return user;
}
