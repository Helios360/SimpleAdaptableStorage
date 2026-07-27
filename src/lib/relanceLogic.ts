/**
 * Relance automatique des formulaires (fiche étudiant / fiche entreprise) restés
 * sans réponse. Logique pure (pas de DB, pas d'horloge implicite) : le « maintenant »
 * est toujours passé en paramètre, ce qui rend la règle testable et déterministe.
 */

/** Délai avant la première relance, puis entre deux relances. */
export const RELANCE_DELAY_MS = 72 * 60 * 60 * 1000; // 72 h

/**
 * Nombre maximum de relances par lien. Un token vit 7 jours : au-delà de deux
 * relances (72 h puis 144 h) il est expiré, le CRE reprend la main en renvoyant
 * les liens depuis le dossier.
 */
export const RELANCE_MAX = 2;

/** Ce que la règle a besoin de connaître d'un lien tokenisé. */
export interface RelanceState {
	createdAt: Date;
	/** Fiche déjà renvoyée → plus rien à relancer. */
	submittedAt: Date | null;
	expiresAt: Date;
	lastRelanceAt: Date | null;
	relanceCount: number;
}

/**
 * Date de la prochaine relance : 72 h après l'envoi du lien, puis 72 h après la
 * relance précédente. null si plus aucune relance n'est à prévoir (fiche reçue
 * ou quota atteint).
 */
export function nextRelanceAt(t: RelanceState): Date | null {
	if (t.submittedAt) return null;
	if (t.relanceCount >= RELANCE_MAX) return null;
	const base = t.lastRelanceAt ?? t.createdAt;
	return new Date(base.getTime() + RELANCE_DELAY_MS);
}

/**
 * Faut-il relancer ce lien maintenant ? Un lien expiré n'est jamais relancé :
 * envoyer une URL morte serait pire que de ne rien envoyer.
 */
export function isRelanceDue(t: RelanceState, now: Date): boolean {
	if (t.expiresAt.getTime() <= now.getTime()) return false;
	const next = nextRelanceAt(t);
	return next != null && next.getTime() <= now.getTime();
}

/**
 * Un placement peut porter plusieurs tokens pour la même audience (chaque
 * « renvoyer les liens » en crée un). Seul le plus récent est relancé, sinon
 * l'entreprise recevrait autant de rappels que de liens émis.
 */
export function keepLatestPerAudience<
	T extends { placementId: number; audience: string; createdAt: Date }
>(rows: T[]): T[] {
	const latest = new Map<string, T>();
	for (const r of rows) {
		const key = `${r.placementId}:${r.audience}`;
		const cur = latest.get(key);
		if (!cur || cur.createdAt.getTime() < r.createdAt.getTime()) latest.set(key, r);
	}
	return [...latest.values()];
}
