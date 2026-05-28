import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { env } from '$env/dynamic/private';
import { db } from './db';
import * as schema from './db/schema';
import { sendMail } from './mailer';

const baseUrl = env.BETTER_AUTH_URL || env.APP_URL || 'http://localhost:3000';

export const auth = betterAuth({
  baseURL: baseUrl,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification
    }
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      await sendMail(
        user.email,
        'Réinitialisation de votre mot de passe',
        `<h1>Réinitialisation</h1><p>Cliquez sur le lien ci-dessous pour définir un nouveau mot de passe (valable 1 heure) :</p><a href="${url}">Réinitialiser mon mot de passe</a>`
      );
    }
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendMail(
        user.email,
        'Validez votre compte',
        `<h1>Bienvenue</h1><p>Cliquez sur le lien suivant pour valider votre adresse :</p><a href="${url}">Valider mon compte</a>`
      );
    },
    autoSignInAfterVerification: true,
    sendOnSignUp: true
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 }
  },
  advanced: {
    cookiePrefix: 'sas'
  }
});

export type Auth = typeof auth;
