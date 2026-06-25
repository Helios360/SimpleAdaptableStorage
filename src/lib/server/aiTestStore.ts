/**
 * Stockage éphémère des bonnes réponses du test IA en cours, indexé par userId.
 * Évite d'exposer les `answer` côté client : le score est calculé par le serveur.
 * Volatile (perdu au redémarrage) — acceptable car le test est court et one-shot.
 */
type Stored = { answers: number[]; expiresAt: number };

const TTL_MS = 30 * 60 * 1000;
const store = new Map<string, Stored>();

export function rememberAnswers(userId: string, answers: number[]): void {
	store.set(userId, { answers, expiresAt: Date.now() + TTL_MS });
}

export function consumeAnswers(userId: string): number[] | null {
	const s = store.get(userId);
	if (!s) return null;
	store.delete(userId);
	if (s.expiresAt < Date.now()) return null;
	return s.answers;
}
