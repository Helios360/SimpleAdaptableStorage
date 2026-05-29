import type { NavItem } from '$lib/components/Sidebar.svelte';

export const CANDIDAT_NAV: NavItem[] = [
	{ href: '/candidat', icon: '🏠', label: 'Dashboard' },
	{ href: '/candidat/profile', icon: '👤', label: 'Mon profil' },
	{ href: '/candidat/cvs', icon: '📄', label: 'Mes CVs' },
	{ href: '/candidat/pitch', icon: '🎥', label: 'Vidéo pitch' },
	{ href: '/candidat/tests', icon: '🧠', label: 'Tests IA' },
	{ href: '/candidat/offres', icon: '💼', label: 'Offres' },
	{ href: '/candidat/candidatures', icon: '📮', label: 'Candidatures' },
	{ href: '/candidat/tosa', icon: '🎓', label: 'Certification Tosa' }
];

export const CRE_NAV: NavItem[] = [
	{ href: '/cre', icon: '🏠', label: 'Dashboard' },
	{ href: '/cre/etudiants', icon: '👥', label: 'Étudiants' },
	{ href: '/cre/cvtheque', icon: '📚', label: 'CVthèque' },
	{ href: '/cre/tests', icon: '🧠', label: 'Tests IA' },
	{ href: '/cre/envoi', icon: '📤', label: 'Envoi groupé' },
	{ href: '/cre/messages', icon: '✉️', label: 'Réponses clients' },
	{ href: '/cre/fiches', icon: '📋', label: 'Fiches de poste' }
];

export const RECRUTEUR_NAV: NavItem[] = [
	{ href: '/recruteur', icon: '📚', label: 'CVthèque' },
	{ href: '/recruteur/retenus', icon: '⭐', label: 'Profils retenus' },
	{ href: '/recruteur/offres', icon: '💼', label: 'Mes offres' }
];
