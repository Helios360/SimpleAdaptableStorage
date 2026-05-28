import type { Handle } from '@sveltejs/kit';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/environment';
import { eq } from 'drizzle-orm';
import { auth } from '$server/auth';
import { db } from '$server/db';
import { userProfiles } from '$server/db/schema';

export const handle: Handle = async ({ event, resolve }) => {
  const session = await auth.api.getSession({ headers: event.request.headers });

  if (session) {
    event.locals.session = session.session;
    const [profile] = await db
      .select({
        name: userProfiles.name,
        isAdmin: userProfiles.isAdmin,
        formationId: userProfiles.formationId
      })
      .from(userProfiles)
      .where(eq(userProfiles.userId, session.user.id))
      .limit(1);

    event.locals.user = {
      id: session.user.id,
      email: session.user.email,
      name: profile?.name || session.user.name,
      isAdmin: profile?.isAdmin ?? false,
      emailVerified: session.user.emailVerified,
      formationId: profile?.formationId ?? null
    };
  } else {
    event.locals.session = null;
    event.locals.user = null;
  }

  return svelteKitHandler({ event, resolve, auth, building });
};
