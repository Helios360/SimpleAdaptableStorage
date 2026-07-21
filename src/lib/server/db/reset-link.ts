/**
 * Génère un lien de réinitialisation de mot de passe pour un utilisateur, sans
 * envoyer d'email (le mailer de l'app est en mode « console » et n'envoie rien).
 *
 * Le lien est imprimé dans le terminal : il suffit de le copier/coller à la
 * personne. Il est valable 1 heure et pointe sur le domaine public
 * (BETTER_AUTH_URL). Le token est stocké dans la même base que l'app, donc le
 * lien fonctionne directement sur le site en production.
 *
 * Usage :
 *   bun src/lib/server/db/reset-link.ts email@exemple.fr
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import * as schema from './schema';

const email = process.argv[2];
if (!email) {
	console.error('Usage : bun src/lib/server/db/reset-link.ts <email>');
	process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL est requis');
	process.exit(1);
}

const client = postgres(url, { max: 1 });
const db = drizzle(client, { schema });

let captured = '';
const auth = betterAuth({
	database: drizzleAdapter(db, { provider: 'pg', schema }),
	emailAndPassword: {
		enabled: true,
		// On capture le lien au lieu de l'envoyer par email.
		sendResetPassword: async ({ url }: { url: string }) => {
			captured = url;
		}
	},
	user: {
		additionalFields: {
			role: { type: 'string', required: false, defaultValue: 'candidat' },
			avatar: { type: 'string', required: false },
			schoolId: { type: 'number', required: false },
			company: { type: 'string', required: false }
		}
	},
	secret: process.env.BETTER_AUTH_SECRET,
	baseURL: process.env.BETTER_AUTH_URL
});

await auth.api.requestPasswordReset({
	body: { email, redirectTo: '/reset-password' } as never
});

if (captured) {
	console.log(`\n✅ Lien de reset pour ${email} (valable 1 h) :\n`);
	console.log(`   ${captured}\n`);
	console.log('   → copie/colle ce lien à la personne.');
} else {
	console.log(`\n⚠️  Aucun lien généré pour ${email}.`);
	console.log('   Email inconnu en base, ou utilisateur sans compte credential.');
}
await client.end();
