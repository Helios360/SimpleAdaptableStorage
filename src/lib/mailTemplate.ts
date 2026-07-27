/**
 * Modèles de mail par école (school.mailTemplate). L'admin saisit un texte avec
 * des variables `{{prenom}}`, `{{lien}}`… substituées à l'envoi. Logique pure :
 * la page Paramètres s'en sert pour documenter les variables, le serveur pour
 * rendre le corps du mail.
 */

/** Variables acceptées dans un modèle, avec leur description (aide à la saisie). */
export const MAIL_VARIABLES: [string, string][] = [
	['prenom', "Prénom de l'étudiant"],
	['nom', "Nom de l'étudiant"],
	['ecole', "Nom de l'école"],
	['formation', "Formation de l'étudiant"],
	['entreprise', "Entreprise du placement (vide si inconnue)"],
	['lien', 'Lien vers le formulaire (obligatoire)'],
	['reglement', "Lien vers le règlement intérieur de l'école"]
];

export const MAIL_VARIABLE_KEYS: ReadonlySet<string> = new Set(MAIL_VARIABLES.map(([k]) => k));

/** Échappe le texte substitué : les valeurs viennent de la base, pas du modèle. */
export function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/** Variables dont la valeur est une URL : rendues en lien cliquable. */
const LINK_VARIABLES: ReadonlySet<string> = new Set(['lien', 'reglement']);

/**
 * Substitue les `{{variables}}` d'un modèle. Une variable inconnue est laissée
 * telle quelle (faute de frappe visible dans le mail plutôt que trou silencieux) ;
 * une variable connue mais sans valeur devient une chaîne vide.
 */
export function renderMailTemplate(
	template: string,
	vars: Record<string, string | null | undefined>
): string {
	return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) => {
		if (!MAIL_VARIABLE_KEYS.has(key)) return match;
		const value = vars[key];
		if (!value) return '';
		const safe = escapeHtml(value);
		return LINK_VARIABLES.has(key) ? `<a href="${safe}">${safe}</a>` : safe;
	});
}

/**
 * Passe un modèle en HTML : les modèles sont saisis au kilomètre dans un
 * textarea, on transforme donc les sauts de ligne en paragraphes. Un modèle qui
 * contient déjà des balises est laissé intact.
 */
export function templateToHtml(text: string): string {
	if (/<[a-z][\s\S]*>/i.test(text)) return text;
	return text
		.split(/\n{2,}/)
		.map((para) => `<p>${para.trim().replace(/\n/g, '<br>')}</p>`)
		.filter((p) => p !== '<p></p>')
		.join('\n');
}

/**
 * Corps de mail prêt à l'envoi. La mise en HTML porte sur le modèle seul (écrit
 * par l'administrateur), la substitution vient après pour que les valeurs
 * échappées ne soient jamais réinterprétées comme du balisage.
 */
export function renderMailBody(
	template: string,
	vars: Record<string, string | null | undefined>
): string {
	return renderMailTemplate(templateToHtml(template), vars);
}
