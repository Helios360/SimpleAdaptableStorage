/**
 * Validation pure (sans DB) pour la page Paramètres : formations et promos.
 * Isolée ici pour être testable indépendamment des actions serveur.
 */

/** Trim d'une valeur de formulaire ; null si vide/absente. */
export function cleanStr(raw: unknown): string | null {
	if (typeof raw !== 'string') return null;
	const t = raw.trim();
	return t.length ? t : null;
}

/** Année de promo : entier dans [2000, 2100], sinon null (champ optionnel). */
export function parsePromoYear(raw: unknown): number | null {
	if (raw == null || raw === '') return null;
	const n = Number(raw);
	if (!Number.isInteger(n) || n < 2000 || n > 2100) return null;
	return n;
}

/** Id optionnel provenant d'un `<select>` ; null si vide/invalide. */
export function parseOptionalId(raw: unknown): number | null {
	if (raw == null || raw === '' || raw === 'null') return null;
	const n = Number(raw);
	return Number.isInteger(n) && n > 0 ? n : null;
}

export type Validated<T> = { ok: true; value: T } | { ok: false; error: string };

export interface FormationInput {
	code: string;
	name: string;
	schoolId: number | null;
}

export function validateFormation(
	codeRaw: unknown,
	nameRaw: unknown,
	schoolIdRaw: unknown
): Validated<FormationInput> {
	const code = cleanStr(codeRaw);
	const name = cleanStr(nameRaw);
	if (!code) return { ok: false, error: 'Le code de la formation est requis.' };
	if (!name) return { ok: false, error: 'Le nom de la formation est requis.' };
	if (code.length > 32) return { ok: false, error: 'Le code est trop long (32 caractères max).' };
	return { ok: true, value: { code, name, schoolId: parseOptionalId(schoolIdRaw) } };
}

export interface PromoInput {
	label: string;
	year: number | null;
	formationId: number | null;
	schoolId: number | null;
}

export function validatePromo(
	labelRaw: unknown,
	yearRaw: unknown,
	formationIdRaw: unknown,
	schoolIdRaw: unknown
): Validated<PromoInput> {
	const label = cleanStr(labelRaw);
	if (!label) return { ok: false, error: 'Le nom de la promo est requis.' };
	if (yearRaw != null && yearRaw !== '' && parsePromoYear(yearRaw) === null) {
		return { ok: false, error: 'Année invalide (attendu entre 2000 et 2100).' };
	}
	return {
		ok: true,
		value: {
			label,
			year: parsePromoYear(yearRaw),
			formationId: parseOptionalId(formationIdRaw),
			schoolId: parseOptionalId(schoolIdRaw)
		}
	};
}

export interface SchoolInput {
	name: string;
	reglementUrl: string | null;
	/** Modèle du mail d'envoi de la fiche étudiant ; null = modèle par défaut. */
	mailTemplate: string | null;
}

export function validateSchool(
	nameRaw: unknown,
	reglementUrlRaw?: unknown,
	mailTemplateRaw?: unknown
): Validated<SchoolInput> {
	const name = cleanStr(nameRaw);
	if (!name) return { ok: false, error: "Le nom de l'école est requis." };
	if (name.length > 80) return { ok: false, error: 'Le nom est trop long (80 caractères max).' };
	const mailTemplate = cleanStr(mailTemplateRaw);
	// Un modèle sans lien vers le formulaire enverrait un mail inutilisable.
	if (mailTemplate && !/\{\{\s*lien\s*\}\}/.test(mailTemplate)) {
		return { ok: false, error: 'Le modèle de mail doit contenir la variable {{lien}}.' };
	}
	return { ok: true, value: { name, reglementUrl: cleanStr(reglementUrlRaw), mailTemplate } };
}
