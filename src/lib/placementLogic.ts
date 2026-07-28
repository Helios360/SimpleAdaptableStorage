/**
 * Logique pure (sans dépendance serveur/DB) partagée autour des placements et
 * des fiches : machine à états du dossier, parseurs de formulaire, libellés et
 * référentiels de codes. Isolée ici pour être testable et évin la duplication
 * entre le back (actions, fiche) et le front (page détail, formulaires publics).
 */

// ─── Machine à états du dossier de placement ────────────────────────────────

export type PlacementStatut =
	| 'brouillon'
	| 'liens_envoyes'
	| 'etudiant_ok'
	| 'entreprise_ok'
	| 'complet';

/** Statut du placement selon l'état de soumission des deux fiches. */
export function computePlacementStatut(etuDone: boolean, entDone: boolean): PlacementStatut {
	if (etuDone && entDone) return 'complet';
	if (etuDone) return 'etudiant_ok';
	if (entDone) return 'entreprise_ok';
	return 'liens_envoyes';
}

// ─── Parseurs de champs de formulaire ───────────────────────────────────────

/** Chaîne nettoyée ou null si vide. */
export function parseFormStr(raw: unknown): string | null {
	const v = String(raw ?? '').trim();
	return v ? v : null;
}

/** Case cochée : accepte les conventions HTML (on/1/true) + « oui ». */
export function parseFormBool(raw: unknown): boolean {
	const v = String(raw ?? '').toLowerCase();
	return v === 'on' || v === '1' || v === 'true' || v === 'oui';
}

/** Entier ou null (chaîne vide / non numérique → null). */
export function parseFormInt(raw: unknown): number | null {
	const v = String(raw ?? '').trim();
	if (!v) return null;
	const n = Number(v);
	return Number.isFinite(n) ? n : null;
}

// ─── Référentiels ────────────────────────────────────────────────────────────

export const VALID_CONTRAT = new Set(['apprentissage', 'professionnalisation']);

export const VALID_STATUT_OPCO = new Set([
	'en_attente',
	'urgent',
	'en_cours',
	'accorde',
	'rupture',
	'annule',
	'cloture',
	'sfp'
]);

/**
 * Les 11 opérateurs de compétences (OPCO) agréés.
 * Source : centre-inffo.fr — présentation des 11 OPCO.
 */
export const OPCO_ORGANISMES: string[] = [
	'AFDAS',
	'AKTO',
	'ATLAS',
	'Constructys',
	'OCAPIAT',
	'OPCO 2i',
	'OPCO EP',
	'OPCO Mobilités',
	'OPCO Santé',
	'Uniformation',
	"L'Opcommerce"
];

export const OPCO_LABELS: Record<string, string> = {
	en_attente: 'En attente',
	urgent: 'Urgent',
	en_cours: 'En cours',
	accorde: 'Accordé',
	rupture: 'Rupture',
	annule: 'Annulé',
	cloture: 'Clôturé',
	sfp: 'SFP'
};

/**
 * Code couleur du suivi OPCO, repris tel quel dans les listes et la synthèse :
 * blanc (en attente) → jaune (urgent) → orange (en cours) → vert (accordé),
 * rouge pour les sorties de dispositif (rupture / annulé / clôturé), violet pour SFP.
 * Le texte est volontairement plus foncé que le fond pour rester lisible.
 */
export const OPCO_COLORS: Record<string, { bg: string; fg: string; border: string }> = {
	en_attente: { bg: '#FFFFFF', fg: '#475569', border: '#CBD5E1' },
	urgent: { bg: '#FEF9C3', fg: '#854D0E', border: '#FACC15' },
	en_cours: { bg: '#FFEDD5', fg: '#9A3412', border: '#FB923C' },
	accorde: { bg: '#D1FAE5', fg: '#047857', border: '#34D399' },
	rupture: { bg: '#FEE2E2', fg: '#B91C1C', border: '#F87171' },
	annule: { bg: '#FEE2E2', fg: '#B91C1C', border: '#F87171' },
	cloture: { bg: '#FEE2E2', fg: '#B91C1C', border: '#F87171' },
	sfp: { bg: '#EDE9FE', fg: '#6D28D9', border: '#A78BFA' }
};

/** Couleurs d'un statut OPCO (fallback : « en attente »). */
export function opcoColor(statut: string | null | undefined) {
	return OPCO_COLORS[statut ?? ''] ?? OPCO_COLORS.en_attente;
}

/** Normalise un type de contrat vers un code valide, sinon null. */
export function normalizeContrat(raw: unknown): string | null {
	const v = parseFormStr(raw);
	return v && VALID_CONTRAT.has(v) ? v : null;
}

/** Normalise un statut OPCO, retombant sur « en_attente » si invalide. */
export function normalizeStatutOpco(raw: unknown): string {
	const v = String(raw ?? '');
	return VALID_STATUT_OPCO.has(v) ? v : 'en_attente';
}

// Codes officiels repris des menus déroulants du formulaire papier
// (« Situation avant contrat » et diplômes).
export const SITUATIONS: [string, string][] = [
	['1', 'Scolaire'],
	['2', 'Prépa apprentissage'],
	['3', 'Étudiant'],
	['4', "Contrat d'apprentissage"],
	['5', 'Contrat de professionnalisation'],
	['6', 'Contrat aidé'],
	['7', 'CFA sous statut stagiaire (avant apprentissage)'],
	['8', 'CFA sans contrat (après rupture)'],
	['9', 'Autre stagiaire formation professionnelle'],
	['10', 'Salarié'],
	['11', "Recherche d'emploi"],
	['12', 'Inactif']
];

export const DIPLOMES: [string, string][] = [
	['13', 'Aucun diplôme'],
	['25', 'Diplôme national du Brevet'],
	['26', 'Certificat de formation générale'],
	['33', 'CAP'],
	['34', 'BEP'],
	['35', 'Mention complémentaire'],
	['38', 'Autre niveau CAP/BEP'],
	['41', 'Bac professionnel'],
	['42', 'Bac général'],
	['43', 'Bac technologique'],
	['44', 'Diplôme de spécialisation professionnelle'],
	['49', 'Autre niveau bac'],
	['54', 'BTS'],
	['55', 'DUT'],
	['58', 'Autre niveau bac+2'],
	['62', 'Licence professionnelle'],
	['63', 'Licence générale'],
	['64', 'BUT'],
	['69', 'Autre niveau bac+3/4'],
	['73', 'Master'],
	['75', "Diplôme d'ingénieur"],
	['76', "Diplôme d'école de commerce"],
	['79', 'Autre niveau bac+5 ou plus'],
	['80', 'Doctorat']
];

export const SITUATION_LABELS: Record<string, string> = Object.fromEntries(SITUATIONS);
export const DIPLOME_LABELS: Record<string, string> = Object.fromEntries(DIPLOMES);

/** Libellé d'un code de situation avant contrat (fallback : le code brut). */
export function situationLabel(code: string | null | undefined): string {
	if (!code) return '—';
	return SITUATION_LABELS[code] ?? code;
}

/** Libellé d'un code de diplôme (fallback : le code brut). */
export function diplomeLabel(code: string | null | undefined): string {
	if (!code) return '—';
	return DIPLOME_LABELS[code] ?? code;
}
