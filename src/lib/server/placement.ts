/**
 * Plomberie des placements : création de liens tokenisés (session sans compte)
 * vers les formulaires publics fiche étudiant / fiche entreprise, et envoi des
 * mails correspondants via le serveur mail de l'app (Gmail en prod, console en
 * dev — donc testable en local sans configuration).
 */
import crypto from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { formToken, placement, candidat, user, school } from './db/schema';
import { sendMail, appUrl } from './mailer';

export type FormAudience = 'etudiant' | 'entreprise';

// Durée de validité d'un lien de formulaire. Plus long qu'un reset de mot de
// passe (1 h) car une entreprise met souvent plusieurs jours à répondre.
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

/** Crée (ou remplace) un token pour un placement + audience et renvoie l'URL publique. */
export async function createFormToken(
	placementId: number,
	audience: FormAudience
): Promise<string> {
	const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
	const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
	await db.insert(formToken).values({ token, placementId, audience, expiresAt });
	return `${appUrl()}/f/${token}`;
}

interface TokenRow {
	token: string;
	placementId: number;
	audience: FormAudience;
	expiresAt: Date;
	submittedAt: Date | null;
}

/** Résout un token public : renvoie null si inconnu, expiré ou déjà soumis. */
export async function resolveFormToken(token: string): Promise<TokenRow | null> {
	const rows = await db
		.select({
			token: formToken.token,
			placementId: formToken.placementId,
			audience: formToken.audience,
			expiresAt: formToken.expiresAt,
			submittedAt: formToken.submittedAt
		})
		.from(formToken)
		.where(eq(formToken.token, token))
		.limit(1);
	const row = rows[0];
	if (!row) return null;
	if (row.expiresAt.getTime() < Date.now()) return null;
	return row as TokenRow;
}

function studentLinkEmail(name: string, url: string, reglementUrl: string | null): string {
	// Le règlement intérieur dépend de l'école de l'étudiant (lien stocké sur school).
	const reglementBlock = reglementUrl
		? `<p>Merci également de prendre connaissance du règlement intérieur de votre
		école : <a href="${reglementUrl}">${reglementUrl}</a></p>`
		: '';
	return `
		<p>Bonjour ${name},</p>
		<p>Afin de finaliser votre dossier d'alternance, merci de compléter votre
		fiche d'informations en cliquant sur le lien ci-dessous :</p>
		<p><a href="${url}">${url}</a></p>
		${reglementBlock}
		<p>Ce lien est personnel et valable 7 jours.</p>
		<p>— L'équipe pédagogique</p>`;
}

function companyLinkEmail(entreprise: string, url: string): string {
	return `
		<p>Bonjour,</p>
		<p>Dans le cadre de la mise en place d'un contrat d'alternance${
			entreprise ? ` avec ${entreprise}` : ''
		}, merci de compléter la fiche de renseignements entreprise via le lien
		ci-dessous :</p>
		<p><a href="${url}">${url}</a></p>
		<p>En retour, nous vous ferons parvenir la convention de formation et le CERFA.</p>
		<p>Ce lien est valable 7 jours.</p>
		<p>— Cloud Campus</p>`;
}

/**
 * Envoie les liens tokenisés pour un placement. Le lien étudiant part sur l'email
 * du compte candidat (déjà en base), le lien entreprise sur l'email de contact
 * saisi par le commercial. Renvoie les adresses effectivement notifiées.
 */
export async function sendPlacementLinks(placementId: number): Promise<{
	etudiant?: string;
	entreprise?: string;
}> {
	const rows = await db
		.select({
			candidatId: placement.candidatId,
			contactEmail: placement.contactEmail,
			entreprise: placement.entreprise,
			fname: candidat.fname,
			lname: candidat.lname,
			studentEmail: user.email,
			reglementUrl: school.reglementUrl
		})
		.from(placement)
		.innerJoin(candidat, eq(candidat.id, placement.candidatId))
		.innerJoin(user, eq(user.id, candidat.userId))
		.leftJoin(school, eq(school.id, user.schoolId))
		.where(eq(placement.id, placementId))
		.limit(1);
	const p = rows[0];
	if (!p) return {};

	const notified: { etudiant?: string; entreprise?: string } = {};

	if (p.studentEmail) {
		const url = await createFormToken(placementId, 'etudiant');
		await sendMail({
			to: p.studentEmail,
			subject: 'Votre fiche d’informations — dossier alternance',
			html: studentLinkEmail(`${p.fname} ${p.lname}`.trim(), url, p.reglementUrl ?? null)
		});
		notified.etudiant = p.studentEmail;
	}

	if (p.contactEmail) {
		const url = await createFormToken(placementId, 'entreprise');
		await sendMail({
			to: p.contactEmail,
			subject: 'Fiche de renseignements entreprise — contrat d’alternance',
			html: companyLinkEmail(p.entreprise ?? '', url)
		});
		notified.entreprise = p.contactEmail;
	}

	return notified;
}
