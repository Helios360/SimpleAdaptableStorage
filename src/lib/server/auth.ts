import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { env } from '$env/dynamic/private';
import { db } from './db';
import * as schema from './db/schema';
import { sendMail } from './mailer';

type AuthInstance = ReturnType<typeof betterAuth>;

let _auth: AuthInstance | null = null;
function instance(): AuthInstance {
	if (_auth) return _auth;
	if (!env.BETTER_AUTH_SECRET) {
		throw new Error('BETTER_AUTH_SECRET is required');
	}
	_auth = betterAuth({
		database: drizzleAdapter(db, { provider: 'pg', schema }),
		emailAndPassword: {
			enabled: true,
			autoSignIn: true,
			minPasswordLength: 4,
			sendResetPassword: async ({ user, url }) => {
				await sendMail({
					to: user.email,
					subject: 'Définissez votre mot de passe — CloudStudent',
					html: `
						<h1>Bienvenue sur CloudStudent</h1>
						<p>Un compte étudiant a été créé pour vous. Pour le finaliser, définissez votre mot de passe en cliquant sur le lien ci-dessous (valable 1 heure) :</p>
						<p><a href="${url}">Définir mon mot de passe</a></p>
						<p>Une fois votre mot de passe défini, votre dossier sera examiné par un administrateur avant d'avoir accès à la plateforme.</p>
					`
				});
			}
		},
		user: {
			additionalFields: {
				role: { type: 'string', required: false, defaultValue: 'candidat' },
				avatar: { type: 'string', required: false },
				school: { type: 'string', required: false },
				company: { type: 'string', required: false }
			}
		},
		session: {
			expiresIn: 60 * 60 * 24 * 7,
			updateAge: 60 * 60 * 24
		},
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL
	});
	return _auth;
}

export const auth: AuthInstance = new Proxy({} as AuthInstance, {
	get(_, prop) {
		const target = instance();
		const value = Reflect.get(target, prop);
		return typeof value === 'function' ? value.bind(target) : value;
	}
});

type Reference = ReturnType<typeof betterAuth>;
export type Auth = Reference;
export type User = Reference['$Infer']['Session']['user'];
export type Session = Reference['$Infer']['Session']['session'];
