import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';

const VALID_ROLES = ['candidat', 'cre', 'recruteur'] as const;
type Role = (typeof VALID_ROLES)[number];

const DEMO_EMAIL: Record<Role, string> = {
	candidat: 'lea@student.fr',
	cre: 'elodie@cloudstudent.fr',
	recruteur: 'marie@orange.fr'
};

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!VALID_ROLES.includes(params.role as Role)) throw redirect(303, '/');
	if (locals.user) {
		const role = (locals.user as { role?: string }).role ?? 'candidat';
		throw redirect(303, `/${role}`);
	}
	return { role: params.role as Role, demoEmail: DEMO_EMAIL[params.role as Role] };
};

function forwardCookies(res: Response, cookies: import('@sveltejs/kit').Cookies) {
	for (const raw of res.headers.getSetCookie()) {
		const segments = raw.split(';').map((s) => s.trim());
		const [head, ...rest] = segments;
		const eq = head.indexOf('=');
		const name = head.slice(0, eq);
		const value = decodeURIComponent(head.slice(eq + 1));
		const opts: Parameters<typeof cookies.set>[2] = { path: '/' };
		for (const part of rest) {
			const [k, v = ''] = part.split('=');
			switch (k.toLowerCase()) {
				case 'path': opts.path = v; break;
				case 'max-age': opts.maxAge = parseInt(v, 10); break;
				case 'expires': opts.expires = new Date(v); break;
				case 'httponly': opts.httpOnly = true; break;
				case 'secure': opts.secure = true; break;
				case 'samesite': opts.sameSite = v.toLowerCase() as 'lax' | 'strict' | 'none'; break;
				case 'domain': opts.domain = v; break;
			}
		}
		cookies.set(name, value, opts);
	}
}

export const actions: Actions = {
	default: async ({ request, params, cookies }) => {
		const role = params.role as Role;
		if (!VALID_ROLES.includes(role)) return fail(400, { error: 'Rôle invalide' });

		const form = await request.formData();
		const email = String(form.get('email') ?? '')
			.toLowerCase()
			.trim();
		const password = String(form.get('password') ?? '');

		if (!email) return fail(400, { error: "L'email est requis.", email });
		if (!/\S+@\S+/.test(email)) return fail(400, { error: 'Email invalide.', email });
		if (!password) return fail(400, { error: 'Le mot de passe est requis.', email });

		let res: Response;
		try {
			res = await auth.api.signInEmail({
				body: { email, password },
				asResponse: true,
				headers: request.headers
			});
		} catch {
			return fail(401, { error: 'Email ou mot de passe incorrect.', email });
		}

		if (!res.ok) return fail(401, { error: 'Email ou mot de passe incorrect.', email });
		forwardCookies(res, cookies);
		throw redirect(303, `/${role}`);
	}
};
