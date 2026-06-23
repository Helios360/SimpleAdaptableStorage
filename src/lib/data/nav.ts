import type { NavItem } from '$lib/components/Sidebar.svelte';

export const CANDIDAT_NAV: NavItem[] = [
	{ href: '/candidat', icon: '🏠', label: 'Dashboard' },
	{ href: '/candidat/profile', icon: '👤', label: 'Mon profil' },
	{ href: '/candidat/files', icon: '📁', label: 'Mes fichiers' }
	// Onglets masqués temporairement (réversible : décommenter pour réafficher)
	// { href: '/candidat/tests', icon: '🧠', label: 'Tests IA' },
	// { href: '/candidat/offres', icon: '💼', label: 'Offres & candidatures' }
];

export const CRE_NAV: NavItem[] = [
	{ href: '/cre', icon: '🏠', label: 'Dashboard' },
	{ href: '/cre/etudiants', icon: '👥', label: 'Étudiants' },
	// CVthèque fusionnée dans la fiche Étudiants (aperçu intégré) — réversible : décommenter pour réafficher
	// { href: '/cre/cvtheque', icon: '📚', label: 'CVthèque' },
	{ href: '/cre/tests', icon: '🧠', label: 'Tests IA' },
	{ href: '/cre/envoi', icon: '📤', label: 'Envoi groupé' },
	{ href: '/cre/fiches', icon: '📋', label: 'Fiches de poste' },
	{ href: '/cre/events', icon: '🗓️', label: 'Événements' },
	{ href: '/cre/messages', icon: '✉️', label: 'Réponses clients' },
	{ href: '/cre/reporting', icon: '📊', label: 'Reporting' }
];

export const RECRUTEUR_NAV: NavItem[] = [
	{ href: '/recruteur', icon: '📚', label: 'CVthèque' },
	{ href: '/recruteur/retenus', icon: '⭐', label: 'Profils retenus' },
	{ href: '/recruteur/offres', icon: '💼', label: 'Mes offres' }
];
