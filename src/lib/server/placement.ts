/**
 * Plomberie des placements : création de liens tokenisés (session sans compte)
 * vers les formulaires publics fiche étudiant / fiche entreprise, et envoi des
 * mails correspondants via le serveur mail de l'app (Gmail en prod, console en
 * dev — donc testable en local sans configuration).
 */
import crypto from 'node:crypto';
import { eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from './db';
import { formToken, placement, candidat, user, school, formation, promo } from './db/schema';
import { sendMail, appUrl } from './mailer';
import { renderMailBody, splitFullName, formatDateFr } from '$lib/mailTemplate';

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
	return formUrl(token);
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

// ─── École de rattachement (règlement intérieur + modèle de mail) ────────────

/** Ce que l'école apporte au mail envoyé à l'étudiant. */
export interface EcoleContext {
	id: number | null;
	name: string | null;
	/** Lien vers le PDF du règlement intérieur hébergé par l'app. */
	reglementLink: string | null;
	/** Modèle de mail « fiche étudiant » propre à l'école ; null = modèle par défaut. */
	mailTemplate: string | null;
	/** Modèle de mail « fiche entreprise » ; null = modèle par défaut. */
	mailTemplateEntreprise: string | null;
}

const EMPTY_ECOLE: EcoleContext = {
	id: null,
	name: null,
	reglementLink: null,
	mailTemplate: null,
	mailTemplateEntreprise: null
};

function reglementLink(id: number | null, path: string | null): string | null {
	if (path && id != null) return `${appUrl()}/files/ecole/${id}/reglement`;
	return null;
}

// Pièces jointes proposées en lien dans les mails (étudiant comme entreprise) :
// le calendrier d'alternance porté par la promo et le référentiel de la formation.
// Pas de lien tant que le document n'a pas été déposé en Paramètres.
function calendrierLink(promoId: number | null | undefined, present: boolean | undefined) {
	return present && promoId != null ? `${appUrl()}/files/promo/${promoId}/calendrier` : null;
}

function referentielLink(formationId: number | null | undefined, present: boolean | undefined) {
	return present && formationId != null
		? `${appUrl()}/files/formation/${formationId}/referentiel`
		: null;
}

/**
 * École d'un étudiant : celle de sa formation en priorité (c'est la formation
 * qui porte le rattachement pédagogique, cf. formation.schoolId), à défaut celle
 * de son compte. De là viennent le règlement intérieur et le modèle de mail.
 */
export async function ecoleForCandidat(candidatId: number): Promise<EcoleContext> {
	const sf = alias(school, 'school_formation');
	const su = alias(school, 'school_user');
	const [row] = await db
		.select({
			fId: sf.id,
			fName: sf.name,
			fPath: sf.reglementPath,
			fTpl: sf.mailTemplate,
			fTplEnt: sf.mailTemplateEntreprise,
			uId: su.id,
			uName: su.name,
			uPath: su.reglementPath,
			uTpl: su.mailTemplate,
			uTplEnt: su.mailTemplateEntreprise
		})
		.from(candidat)
		.innerJoin(user, eq(user.id, candidat.userId))
		.leftJoin(formation, eq(formation.id, candidat.formationId))
		.leftJoin(sf, eq(sf.id, formation.schoolId))
		.leftJoin(su, eq(su.id, user.schoolId))
		.where(eq(candidat.id, candidatId))
		.limit(1);
	if (!row) return EMPTY_ECOLE;

	if (row.fId != null) {
		return {
			id: row.fId,
			name: row.fName,
			reglementLink: reglementLink(row.fId, row.fPath),
			mailTemplate: row.fTpl,
			mailTemplateEntreprise: row.fTplEnt
		};
	}
	if (row.uId != null) {
		return {
			id: row.uId,
			name: row.uName,
			reglementLink: reglementLink(row.uId, row.uPath),
			mailTemplate: row.uTpl,
			mailTemplateEntreprise: row.uTplEnt
		};
	}
	return EMPTY_ECOLE;
}

// ─── Corps des mails ────────────────────────────────────────────────────────
// Les mêmes corps servent à l'envoi initial et aux relances automatiques (voir
// src/lib/server/relance.ts) : seule l'accroche change, pour que le destinataire
// comprenne qu'il s'agit d'un rappel sur un lien déjà reçu.

export interface StudentMailContext {
	prenom: string;
	nom: string;
	url: string;
	ecole?: EcoleContext;
	formation?: string | null;
	entreprise?: string | null;
	/** Nom complet du CRE ayant réalisé la passation (placement.commercialId). */
	cre?: string | null;
	/** Date de rentrée de la promo, ISO `YYYY-MM-DD`. */
	dateRentree?: string | null;
	/** Id de la promo, pour construire le lien vers son calendrier. */
	promoId?: number | null;
	/** Vrai si la promo a un calendrier déposé (sinon pas de lien à proposer). */
	calendrier?: boolean;
	/** Id de la formation, pour construire le lien vers son référentiel. */
	formationId?: number | null;
	/** Vrai si la formation a un référentiel déposé. */
	referentiel?: boolean;
	relance?: boolean;
}

/**
 * Mail d'envoi de la fiche étudiant. Si l'école a défini un modèle, il fait foi
 * (variables {{prenom}}, {{lien}}… substituées) ; sinon on retombe sur le
 * modèle par défaut de l'application.
 */
export function studentLinkEmail(ctx: StudentMailContext): string {
	const ecole = ctx.ecole ?? EMPTY_ECOLE;
	const rappel = ctx.relance
		? `<p><strong>Rappel :</strong> nous n'avons pas encore reçu votre fiche d'informations.</p>`
		: '';

	if (ecole.mailTemplate) {
		const cre = splitFullName(ctx.cre);
		return (
			rappel +
			renderMailBody(ecole.mailTemplate, {
				prenom: ctx.prenom,
				nom: ctx.nom,
				ecole: ecole.name,
				formation: ctx.formation,
				entreprise: ctx.entreprise,
				prenom_cre: cre.prenom,
				nom_cre: cre.nom,
				date_rentree: formatDateFr(ctx.dateRentree),
				lien: ctx.url,
				reglement: ecole.reglementLink,
				calendrier: calendrierLink(ctx.promoId, ctx.calendrier),
				referentiel: referentielLink(ctx.formationId, ctx.referentiel)
			})
		);
	}

	const reglementBlock = ecole.reglementLink
		? `<p>Merci également de prendre connaissance du règlement intérieur de votre
		école : <a href="${ecole.reglementLink}">${ecole.reglementLink}</a></p>`
		: '';
	const intro = ctx.relance
		? `<p>Nous n'avons pas encore reçu votre fiche d'informations. Merci de la
		compléter dès que possible pour ne pas retarder votre dossier :</p>`
		: `<p>Afin de finaliser votre dossier d'alternance, merci de compléter votre
		fiche d'informations en cliquant sur le lien ci-dessous :</p>`;
	return `
		<p>Bonjour ${`${ctx.prenom} ${ctx.nom}`.trim()},</p>
		${intro}
		<p><a href="${ctx.url}">${ctx.url}</a></p>
		${reglementBlock}
		<p>Ce lien est personnel et valable 7 jours.</p>
		<p>— L'équipe pédagogique</p>`;
}

export interface CompanyMailContext {
	url: string;
	entreprise?: string | null;
	/** Contact entreprise destinataire du mail (saisi à la passation). */
	contactPrenom?: string | null;
	contactNom?: string | null;
	/** Étudiant concerné par le contrat. */
	prenom?: string | null;
	nom?: string | null;
	ecole?: EcoleContext;
	formation?: string | null;
	cre?: string | null;
	dateRentree?: string | null;
	/** Id de la promo, pour construire le lien vers son calendrier. */
	promoId?: number | null;
	/** Vrai si la promo a un calendrier déposé (sinon pas de lien à proposer). */
	calendrier?: boolean;
	/** Id de la formation, pour construire le lien vers son référentiel. */
	formationId?: number | null;
	/** Vrai si la formation a un référentiel déposé. */
	referentiel?: boolean;
	relance?: boolean;
}

/**
 * Mail d'envoi de la fiche entreprise. Comme pour la fiche étudiant, le modèle
 * de l'école fait foi s'il est défini ; sinon on retombe sur le modèle par
 * défaut de l'application.
 */
export function companyLinkEmail(ctx: CompanyMailContext): string {
	const ecole = ctx.ecole ?? EMPTY_ECOLE;
	const entreprise = ctx.entreprise ?? '';
	const rappel = ctx.relance
		? `<p><strong>Rappel :</strong> nous n'avons pas encore reçu votre fiche de renseignements.</p>`
		: '';

	if (ecole.mailTemplateEntreprise) {
		const cre = splitFullName(ctx.cre);
		return (
			rappel +
			renderMailBody(ecole.mailTemplateEntreprise, {
				contact_prenom: ctx.contactPrenom,
				contact_nom: ctx.contactNom,
				prenom: ctx.prenom,
				nom: ctx.nom,
				entreprise,
				ecole: ecole.name,
				formation: ctx.formation,
				prenom_cre: cre.prenom,
				nom_cre: cre.nom,
				date_rentree: formatDateFr(ctx.dateRentree),
				lien: ctx.url,
				calendrier: calendrierLink(ctx.promoId, ctx.calendrier),
				referentiel: referentielLink(ctx.formationId, ctx.referentiel)
			})
		);
	}

	const intro = ctx.relance
		? `<p>Sauf erreur de notre part, la fiche de renseignements${
				entreprise ? ` concernant ${entreprise}` : ''
			} ne nous est pas encore parvenue. Merci de la compléter via le lien
		ci-dessous :</p>`
		: `<p>Dans le cadre de la mise en place d'un contrat d'alternance${
				entreprise ? ` avec ${entreprise}` : ''
			}, merci de compléter la fiche de renseignements entreprise via le lien
		ci-dessous :</p>`;
	return `
		<p>Bonjour,</p>
		${intro}
		<p><a href="${ctx.url}">${ctx.url}</a></p>
		<p>En retour, nous vous ferons parvenir la convention de formation et le CERFA.</p>
		<p>Ce lien est valable 7 jours.</p>
		<p>— ${ecole.name ?? 'Cloud Campus'}</p>`;
}

/** Objet du mail selon l'audience, préfixé « Rappel » pour une relance. */
export function linkSubject(audience: FormAudience, relance = false): string {
	const base =
		audience === 'etudiant'
			? 'Votre fiche d’informations — dossier alternance'
			: 'Fiche de renseignements entreprise — contrat d’alternance';
	return relance ? `Rappel — ${base}` : base;
}

/** URL publique d'un formulaire à partir de son token. */
export function formUrl(token: string): string {
	return `${appUrl()}/f/${token}`;
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
	// Le CRE ayant réalisé la passation alimente {{prenom_cre}} / {{nom_cre}} ;
	// son compte peut avoir été supprimé depuis (commercialId passe à null).
	const cre = alias(user, 'user_cre');
	const rows = await db
		.select({
			candidatId: placement.candidatId,
			contactEmail: placement.contactEmail,
			contactPrenom: placement.contactPrenom,
			contactNom: placement.contactNom,
			entreprise: placement.entreprise,
			fname: candidat.fname,
			lname: candidat.lname,
			studentEmail: user.email,
			formationName: formation.name,
			formationId: formation.id,
			referentielPath: formation.referentielPath,
			creName: cre.name,
			promoId: promo.id,
			dateRentree: promo.dateRentree,
			calendrierPath: promo.calendrierPath
		})
		.from(placement)
		.innerJoin(candidat, eq(candidat.id, placement.candidatId))
		.innerJoin(user, eq(user.id, candidat.userId))
		.leftJoin(formation, eq(formation.id, candidat.formationId))
		.leftJoin(cre, eq(cre.id, placement.commercialId))
		.leftJoin(promo, eq(promo.id, placement.promoId))
		.where(eq(placement.id, placementId))
		.limit(1);
	const p = rows[0];
	if (!p) return {};

	const notified: { etudiant?: string; entreprise?: string } = {};

	if (p.studentEmail) {
		const url = await createFormToken(placementId, 'etudiant');
		const ecole = await ecoleForCandidat(p.candidatId);
		await sendMail({
			to: p.studentEmail,
			subject: linkSubject('etudiant'),
			html: studentLinkEmail({
				prenom: p.fname,
				nom: p.lname,
				url,
				ecole,
				formation: p.formationName,
				entreprise: p.entreprise,
				cre: p.creName,
				dateRentree: p.dateRentree,
				promoId: p.promoId,
				calendrier: !!p.calendrierPath,
				formationId: p.formationId,
				referentiel: !!p.referentielPath
			})
		});
		notified.etudiant = p.studentEmail;
	}

	if (p.contactEmail) {
		const url = await createFormToken(placementId, 'entreprise');
		await sendMail({
			to: p.contactEmail,
			subject: linkSubject('entreprise'),
			html: companyLinkEmail({
				url,
				entreprise: p.entreprise,
				contactPrenom: p.contactPrenom,
				contactNom: p.contactNom,
				prenom: p.fname,
				nom: p.lname,
				ecole: await ecoleForCandidat(p.candidatId),
				formation: p.formationName,
				cre: p.creName,
				dateRentree: p.dateRentree,
				promoId: p.promoId,
				calendrier: !!p.calendrierPath,
				formationId: p.formationId,
				referentiel: !!p.referentielPath
			})
		});
		notified.entreprise = p.contactEmail;
	}

	return notified;
}
