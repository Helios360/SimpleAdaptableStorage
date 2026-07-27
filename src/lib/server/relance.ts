/**
 * Relance automatique des formulaires restés sans réponse : si une entreprise
 * (ou un étudiant) n'a pas soumis sa fiche 72 h après l'envoi du lien, un rappel
 * part sur la même adresse, avec le même lien tokenisé — le formulaire déjà
 * ouvert reste donc valable.
 *
 * Deux déclencheurs, complémentaires :
 *  • un minuteur interne démarré par hooks.server.ts (rien à configurer) ;
 *  • l'endpoint POST /api/cron/relances, pour un cron externe.
 * Les deux passent par runRelances(), qui est idempotent : le compteur et
 * l'horodatage portés par le token empêchent tout double envoi.
 */
import { and, eq, gt, isNull } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { env } from '$env/dynamic/private';
import { db } from './db';
import { formToken, placement, candidat, user, formation, promo } from './db/schema';
import { sendMail } from './mailer';
import {
	studentLinkEmail,
	companyLinkEmail,
	linkSubject,
	formUrl,
	ecoleForCandidat,
	type FormAudience
} from './placement';
import { isRelanceDue, keepLatestPerAudience, RELANCE_DELAY_MS } from '$lib/relanceLogic';

export interface RelanceReport {
	/** Liens en attente examinés. */
	checked: number;
	/** Relances effectivement envoyées. */
	sent: number;
	/** Destinataires notifiés (utile aux logs et aux tests manuels). */
	recipients: string[];
	/** Envois en échec (adresse invalide, panne SMTP…). */
	failed: number;
}

/**
 * Parcourt les liens non soumis et encore valides, et envoie un rappel à ceux
 * dont la relance est due. Chaque envoi est isolé : un mail en échec n'empêche
 * pas les suivants et ne consomme pas le quota de relances.
 */
export async function runRelances(now: Date = new Date()): Promise<RelanceReport> {
	// Même CRE que sur l'envoi initial : un rappel garde le signataire du premier mail.
	const cre = alias(user, 'user_cre');
	const rows = await db
		.select({
			token: formToken.token,
			placementId: formToken.placementId,
			audience: formToken.audience,
			createdAt: formToken.createdAt,
			expiresAt: formToken.expiresAt,
			submittedAt: formToken.submittedAt,
			lastRelanceAt: formToken.lastRelanceAt,
			relanceCount: formToken.relanceCount,
			candidatId: placement.candidatId,
			entreprise: placement.entreprise,
			contactEmail: placement.contactEmail,
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
		.from(formToken)
		.innerJoin(placement, eq(placement.id, formToken.placementId))
		.innerJoin(candidat, eq(candidat.id, placement.candidatId))
		.innerJoin(user, eq(user.id, candidat.userId))
		.leftJoin(formation, eq(formation.id, candidat.formationId))
		.leftJoin(cre, eq(cre.id, placement.commercialId))
		.leftJoin(promo, eq(promo.id, placement.promoId))
		.where(and(isNull(formToken.submittedAt), gt(formToken.expiresAt, now)));

	const report: RelanceReport = { checked: 0, sent: 0, recipients: [], failed: 0 };

	for (const r of keepLatestPerAudience(rows)) {
		report.checked++;
		if (!isRelanceDue(r, now)) continue;

		const audience = r.audience as FormAudience;
		const to = audience === 'etudiant' ? r.studentEmail : r.contactEmail;
		if (!to) continue;

		const url = formUrl(r.token);
		const html =
			audience === 'etudiant'
				? studentLinkEmail({
						prenom: r.fname,
						nom: r.lname,
						url,
						// Le modèle de mail et le règlement viennent de l'école (via la formation).
						ecole: await ecoleForCandidat(r.candidatId),
						formation: r.formationName,
						entreprise: r.entreprise,
						cre: r.creName,
						dateRentree: r.dateRentree,
						promoId: r.promoId,
						calendrier: !!r.calendrierPath,
						formationId: r.formationId,
						referentiel: !!r.referentielPath,
						relance: true
					})
				: companyLinkEmail(r.entreprise ?? '', url, true);

		try {
			await sendMail({ to, subject: linkSubject(audience, true), html });
		} catch (err) {
			console.error(`[relance] échec de l'envoi à ${to}`, err);
			report.failed++;
			continue;
		}

		await db
			.update(formToken)
			.set({ lastRelanceAt: now, relanceCount: r.relanceCount + 1 })
			.where(eq(formToken.token, r.token));
		report.sent++;
		report.recipients.push(to);
	}

	return report;
}

// ─── Minuteur interne ────────────────────────────────────────────────────────

/** Fréquence de balayage. Bien plus courte que le délai de relance : une fiche
 *  soumise entre deux passages n'est de toute façon plus relancée. */
const TICK_MS = 60 * 60 * 1000; // 1 h

let timer: ReturnType<typeof setInterval> | null = null;

/**
 * Démarre le balayage horaire (idempotent : un seul minuteur par processus).
 * `RELANCE_AUTO=off` le désactive — pour un déploiement piloté par un cron
 * externe, ou pour ne pas envoyer de mails depuis un environnement de test.
 */
export function startRelanceScheduler(): void {
	if (timer || env.RELANCE_AUTO === 'off') return;
	timer = setInterval(() => {
		runRelances()
			.then((r) => {
				if (r.sent) console.log(`[relance] ${r.sent} rappel(s) envoyé(s)`);
			})
			.catch((err) => console.error('[relance] balayage en échec', err));
	}, TICK_MS);
	// Ne pas maintenir le processus en vie juste pour ce minuteur.
	timer.unref?.();
	console.log(
		`[relance] balayage actif (toutes les ${TICK_MS / 60000} min, relance à ${
			RELANCE_DELAY_MS / 3600000
		} h)`
	);
}
