export interface TemplateVar {
	k: string;
	label: string;
	def: string;
}

export interface MessageTemplate {
	id: string;
	icon: string;
	cat: 'Entreprise' | 'Candidat';
	label: string;
	desc: string;
	vars: TemplateVar[];
	subject: string;
	body: string;
}

export const MSG_TEMPLATES: MessageTemplate[] = [
	{
		id: 'relance_entreprise',
		icon: '📞',
		cat: 'Entreprise',
		label: 'Relancer une entreprise',
		desc: "Après un envoi de profils resté sans réponse",
		vars: [
			{ k: 'entreprise', label: 'Entreprise', def: 'Thales' },
			{ k: 'contact', label: 'Contact', def: 'Mme Lefèvre' },
			{ k: 'nb', label: 'Nb profils', def: '3' }
		],
		subject: 'Suivi des profils transmis – {entreprise}',
		body: `Bonjour {contact},

Je me permets de revenir vers vous concernant les {nb} profils que je vous ai transmis la semaine dernière pour vos besoins en recrutement.

Ces candidats ont été qualifiés via notre processus d'évaluation (tests techniques + certification Tosa) et correspondent à vos critères.

Seriez-vous disponible cette semaine pour un court échange ? Je reste à votre écoute pour toute information complémentaire.

Bien cordialement,
Élodie Garessus
Chargée de relations entreprises – IPSSI Paris`
	},
	{
		id: 'candidat_valide',
		icon: '✅',
		cat: 'Candidat',
		label: 'Informer un candidat – dossier validé',
		desc: 'Notification de validation du dossier',
		vars: [{ k: 'prenom', label: 'Prénom', def: 'Léa' }],
		subject: 'Votre dossier est validé 🎉',
		body: `Bonjour {prenom},

Bonne nouvelle : votre dossier vient d'être validé !

Votre profil (CV, score IA et certification) est désormais visible par nos entreprises partenaires via la CVthèque. Vous pourriez être contacté(e) directement pour des opportunités.

Pensez à garder votre profil à jour et à ajouter une vidéo de présentation si ce n'est pas déjà fait — cela augmente nettement vos chances.

Bon courage dans vos recherches,
L'équipe CloudStudent`
	},
	{
		id: 'candidat_refus',
		icon: '💬',
		cat: 'Candidat',
		label: 'Informer un candidat – remédiation',
		desc: "Refus bienveillant + axe d'amélioration",
		vars: [
			{ k: 'prenom', label: 'Prénom', def: 'Hugo' },
			{ k: 'axe', label: 'Point à travailler', def: 'le test technique' }
		],
		subject: 'Votre dossier – prochaines étapes',
		body: `Bonjour {prenom},

Merci pour le temps consacré à la constitution de votre dossier.

En l'état, nous ne pouvons pas encore le valider, principalement concernant {axe}. Ce n'est pas un refus définitif : nous vous proposons une phase de remédiation pour renforcer ce point.

Je vous propose un rendez-vous d'accompagnement pour en discuter et préparer une nouvelle soumission. Quelles seraient vos disponibilités ?

Bien à vous,
Élodie Garessus – IPSSI Paris`
	},
	{
		id: 'proposition_profil',
		icon: '👤',
		cat: 'Entreprise',
		label: 'Proposer un profil à un recruteur',
		desc: 'Présenter un candidat qualifié',
		vars: [
			{ k: 'contact', label: 'Contact', def: 'M. Durand' },
			{ k: 'candidat', label: 'Candidat', def: 'Sara Benali' },
			{ k: 'poste', label: 'Poste', def: 'Développeuse Front-end' },
			{ k: 'score', label: 'Score IA', def: '90' }
		],
		subject: 'Profil qualifié pour votre poste de {poste}',
		body: `Bonjour {contact},

Dans le cadre de votre recherche pour le poste de {poste}, je souhaite vous présenter {candidat}, dont le profil correspond particulièrement à vos attentes.

• Score d'évaluation IA : {score}/100
• Certification Tosa obtenue
• Vidéo de présentation disponible

Vous pouvez consulter son dossier complet directement sur votre extranet recruteur. Je reste disponible pour organiser un entretien.

Cordialement,
Élodie Garessus – IPSSI Paris`
	},
	{
		id: 'invitation_event',
		icon: '🎓',
		cat: 'Entreprise',
		label: 'Inviter à un événement',
		desc: 'Forum, JPO, job dating',
		vars: [
			{ k: 'contact', label: 'Contact', def: 'Mme Lefèvre' },
			{ k: 'event', label: 'Événement', def: 'Job Dating Alternance' },
			{ k: 'date', label: 'Date', def: 'le 18 juin 2026' }
		],
		subject: 'Invitation – {event}',
		body: `Bonjour {contact},

Nous organisons {event} {date} et serions ravis de vous y accueillir.

Ce sera l'occasion de rencontrer directement nos étudiants qualifiés, dans un format court et efficace (entretiens de 15 min).

Souhaitez-vous réserver un créneau ? Je vous transmets le programme détaillé sur simple demande.

Au plaisir de vous y retrouver,
Élodie Garessus – IPSSI Paris`
	}
];

export function fillTemplate(text: string, values: Record<string, string>): string {
	return text.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? `{${k}}`);
}
