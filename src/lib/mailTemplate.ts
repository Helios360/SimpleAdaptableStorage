/**
 * Modèles de mail par école (school.mailTemplate). L'admin saisit un texte avec
 * des variables `{{prenom}}`, `{{lien}}`… substituées à l'envoi. Logique pure :
 * la page Paramètres s'en sert pour documenter les variables, le serveur pour
 * rendre le corps du mail.
 */

/** Variables du modèle « fiche étudiant », avec leur description (aide à la saisie). */
export const MAIL_VARIABLES: [string, string][] = [
	['prenom', "Prénom de l'étudiant"],
	['nom', "Nom de l'étudiant"],
	['ecole', "Nom de l'école"],
	['formation', "Formation de l'étudiant"],
	['entreprise', "Entreprise du placement (vide si inconnue)"],
	['prenom_cre', 'Prénom du CRE qui a réalisé la passation'],
	['nom_cre', 'Nom du CRE qui a réalisé la passation'],
	['date_rentree', 'Date de rentrée de la promo (JJ/MM/AAAA)'],
	['lien', 'Lien vers le formulaire (obligatoire)'],
	['reglement', "Lien vers le règlement intérieur de l'école"],
	['calendrier', "Lien vers le calendrier d'alternance de la promo"],
	['referentiel', 'Lien vers le référentiel (plaquette) de la formation']
];

/**
 * Variables du modèle « fiche entreprise ». `prenom` / `nom` désignent toujours
 * l'étudiant (comme dans le modèle étudiant) ; le destinataire, lui, est le
 * contact de l'entreprise, d'où `contact_prenom` / `contact_nom`.
 */
export const MAIL_VARIABLES_ENTREPRISE: [string, string][] = [
	['contact_prenom', "Prénom du contact dans l'entreprise (destinataire)"],
	['contact_nom', 'Nom du contact'],
	['prenom', "Prénom de l'étudiant"],
	['nom', "Nom de l'étudiant"],
	['entreprise', "Nom de l'entreprise"],
	['ecole', "Nom de l'école"],
	['formation', "Formation de l'étudiant"],
	['prenom_cre', 'Prénom du CRE qui a réalisé la passation'],
	['nom_cre', 'Nom du CRE qui a réalisé la passation'],
	['date_rentree', 'Date de rentrée de la promo (JJ/MM/AAAA)'],
	['lien', 'Lien vers la fiche entreprise (obligatoire)']
];

// Un seul registre pour la substitution : une variable n'est remplacée que si
// elle est documentée pour l'une des deux audiences. Écrire {{reglement}} dans
// un modèle entreprise le laissera donc visible en clair dans le mail, faute de
// valeur — signal préférable à un trou silencieux.
export const MAIL_VARIABLE_KEYS: ReadonlySet<string> = new Set(
	[...MAIL_VARIABLES, ...MAIL_VARIABLES_ENTREPRISE].map(([k]) => k)
);

/**
 * Découpe un nom complet en prénom + nom. Les comptes membres n'ont qu'un champ
 * `name` : on prend le premier mot comme prénom et le reste comme nom, ce qui
 * couvre la saisie usuelle « Prénom Nom » sans se tromper sur les noms composés.
 */
export function splitFullName(full: string | null | undefined): {
	prenom: string;
	nom: string;
} {
	const parts = (full ?? '').trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return { prenom: '', nom: '' };
	return { prenom: parts[0], nom: parts.slice(1).join(' ') };
}

/** Échappe le texte substitué : les valeurs viennent de la base, pas du modèle. */
export function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/** Variables dont la valeur est une URL : rendues en lien cliquable. */
const LINK_VARIABLES: ReadonlySet<string> = new Set([
	'lien',
	'reglement',
	'calendrier',
	'referentiel'
]);

/** Date ISO `YYYY-MM-DD` en JJ/MM/AAAA ; chaîne vide si absente ou malformée. */
export function formatDateFr(iso: string | null | undefined): string {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((iso ?? '').trim());
	return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

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
