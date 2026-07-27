/**
 * Suggestion de rémunération d'un alternant à partir de son âge.
 *
 * La grille légale (pourcentage du SMIC selon l'âge et l'année d'exécution du
 * contrat) est un référentiel réglementaire révisé une fois par an : elle vit
 * ici en dur plutôt qu'en base — aucune saisie côté utilisateur, et une seule
 * ligne à mettre à jour à la revalorisation. Logique pure (pas de dépendance
 * serveur) pour être partagée entre le dossier CRE et le formulaire public.
 */

/** SMIC mensuel brut, base 35 h. À mettre à jour à chaque revalorisation. */
export const SMIC_MENSUEL_BRUT = 1801.8;

export type TypeContrat = 'apprentissage' | 'professionnalisation';

/** Une tranche d'âge de la grille. `maxAge` null = pas de borne supérieure. */
export interface TrancheSalaire {
	minAge: number;
	maxAge: number | null;
	label: string;
	/** % du SMIC par année d'exécution du contrat (1re, 2e, 3e). */
	pct: [number, number, number];
}

/**
 * Contrat d'apprentissage — % du SMIC par tranche d'âge et année de contrat.
 * L'âge retenu est celui de l'apprenti au moment de l'année considérée.
 */
export const GRILLE_APPRENTISSAGE: TrancheSalaire[] = [
	{ minAge: 0, maxAge: 17, label: 'Moins de 18 ans', pct: [27, 39, 55] },
	{ minAge: 18, maxAge: 20, label: '18 à 20 ans', pct: [43, 51, 67] },
	{ minAge: 21, maxAge: 25, label: '21 à 25 ans', pct: [53, 61, 78] },
	{ minAge: 26, maxAge: null, label: '26 ans et plus', pct: [100, 100, 100] }
];

/**
 * Contrat de professionnalisation — % du SMIC pour un alternant déjà titulaire
 * d'un bac professionnel ou d'un diplôme supérieur (cas de nos formations). Le
 * montant ne dépend pas de l'année d'exécution, d'où les trois colonnes égales.
 */
export const GRILLE_PROFESSIONNALISATION: TrancheSalaire[] = [
	{ minAge: 0, maxAge: 20, label: 'Moins de 21 ans', pct: [65, 65, 65] },
	{ minAge: 21, maxAge: 25, label: '21 à 25 ans', pct: [80, 80, 80] },
	{ minAge: 26, maxAge: null, label: '26 ans et plus', pct: [100, 100, 100] }
];

export function grillePour(type: TypeContrat | string | null | undefined): TrancheSalaire[] {
	return type === 'professionnalisation' ? GRILLE_PROFESSIONNALISATION : GRILLE_APPRENTISSAGE;
}

/** Tranche correspondant à un âge, ou null si l'âge est inconnu / aberrant. */
export function trancheForAge(
	age: number | null | undefined,
	type: TypeContrat | string | null | undefined = 'apprentissage'
): TrancheSalaire | null {
	if (age == null || !Number.isFinite(age) || age < 0 || age > 120) return null;
	return (
		grillePour(type).find((t) => age >= t.minAge && (t.maxAge == null || age <= t.maxAge)) ?? null
	);
}

export interface SuggestionSalaire {
	/** Année d'exécution du contrat (1, 2 ou 3). */
	annee: number;
	/** Pourcentage du SMIC applicable. */
	pct: number;
	/** Montant mensuel brut arrondi à l'euro. */
	montant: number;
}

/** Arrondi à l'euro du % du SMIC (les grilles officielles s'entendent au brut). */
function montantPour(pct: number): number {
	return Math.round((SMIC_MENSUEL_BRUT * pct) / 100);
}

/**
 * Suggestion pour une année d'exécution donnée (1 par défaut, bornée à [1, 3]).
 * Renvoie null si l'âge est inconnu.
 */
export function suggestSalaire(
	age: number | null | undefined,
	annee: number = 1,
	type: TypeContrat | string | null | undefined = 'apprentissage'
): SuggestionSalaire | null {
	const tranche = trancheForAge(age, type);
	if (!tranche) return null;
	const a = Math.min(3, Math.max(1, Math.trunc(Number(annee) || 1)));
	const pct = tranche.pct[a - 1];
	return { annee: a, pct, montant: montantPour(pct) };
}

/** Les trois années d'un contrat, pour un affichage en tableau. */
export function suggestionsParAnnee(
	age: number | null | undefined,
	type: TypeContrat | string | null | undefined = 'apprentissage'
): SuggestionSalaire[] {
	const tranche = trancheForAge(age, type);
	if (!tranche) return [];
	return tranche.pct.map((pct, i) => ({ annee: i + 1, pct, montant: montantPour(pct) }));
}

/** Montant formaté « 1 234 € » (espace insécable avant le symbole). */
export function formatEuros(montant: number): string {
	return `${montant.toLocaleString('fr-FR')} €`;
}
