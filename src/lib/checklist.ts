/**
 * Checklist « dossier » d'un étudiant, affichée dans la Synthèse et stockée en
 * base (JSONB `candidat.checklist`). Logique pure (pas de dépendance serveur)
 * pour être partagée entre la page et les tests.
 *
 * La liste comporte un tronc commun + des items conditionnels selon le
 * « type d'école » déduit du libellé libre `user.school` (voir schoolType).
 */

export type SchoolType = 'cloud_campus' | 'skalys' | 'autre';

/**
 * Déduit le type d'école du libellé libre `user.school`. Robuste aux variantes
 * de casse / d'espacement ; retombe sur 'autre' (tronc commun seul) si rien ne
 * correspond.
 */
export function schoolType(school: string | null | undefined): SchoolType {
	const s = (school ?? '').toLowerCase();
	if (s.includes('skalys')) return 'skalys';
	if (s.includes('cloud')) return 'cloud_campus';
	return 'autre';
}

export interface ChecklistItem {
	key: string;
	label: string;
	/** Sous-groupe visuel (ex. « Cerfa »). */
	group?: string;
	/** Item réservé à un type d'école ; absent = tronc commun. */
	school?: SchoolType;
}

/** Ordre d'affichage. Les clés servent aussi de clés de stockage JSONB. */
export const CHECKLIST_ITEMS: ChecklistItem[] = [
	{ key: 'formulaireEtudiant', label: 'Formulaire étudiant' },
	{ key: 'formulaireEntreprise', label: 'Formulaire entreprise' },
	{ key: 'conventionFormation', label: 'Convention de formation' },
	{ key: 'cerfaEnvoye', label: 'Envoyer pour signature', group: 'Cerfa' },
	{ key: 'cerfaSigneEtudiant', label: 'Signer étudiant', group: 'Cerfa' },
	{ key: 'cerfaSigneEntreprise', label: 'Signer entreprise', group: 'Cerfa' },
	{ key: 'contributionObligatoire', label: 'Contribution obligatoire' },
	{ key: 'ypareoNeo', label: 'Yparéo neo' },
	{ key: 'discord', label: 'Discord', school: 'cloud_campus' },
	{ key: 'eLearning', label: 'Plateforme e-learning', school: 'skalys' }
];

/** État stocké : map clé d'item → coché. Les clés inconnues sont ignorées. */
export type ChecklistState = Record<string, boolean>;

/** Items visibles pour un type d'école donné (tronc commun + conditionnels). */
export function checklistItemsForSchool(type: SchoolType): ChecklistItem[] {
	return CHECKLIST_ITEMS.filter((it) => !it.school || it.school === type);
}

/** Ensemble des clés valides (pour filtrer un payload entrant). */
export const CHECKLIST_KEYS: ReadonlySet<string> = new Set(CHECKLIST_ITEMS.map((it) => it.key));

/** Ne conserve que les clés connues, coercées en booléens. */
export function sanitizeChecklist(input: unknown): ChecklistState {
	const out: ChecklistState = {};
	if (input && typeof input === 'object') {
		for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
			if (CHECKLIST_KEYS.has(k)) out[k] = !!v;
		}
	}
	return out;
}

/** Progression (items cochés / total) pour un type d'école. */
export function checklistProgress(type: SchoolType, state: ChecklistState) {
	const items = checklistItemsForSchool(type);
	const done = items.filter((it) => state[it.key]).length;
	return { done, total: items.length };
}
