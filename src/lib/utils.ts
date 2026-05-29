import { C } from './tokens';

export const initials = (name: string): string =>
	name
		.split(' ')
		.filter(Boolean)
		.map((p) => p[0])
		.join('')
		.toUpperCase();

export const scoreColor = (s: number | null | undefined): string => {
	if (s == null) return C.muted;
	if (s >= 75) return C.green;
	if (s >= 60) return C.orange;
	return C.red;
};

export const statutLabel = (s: string): string =>
	({ en_attente: 'En attente', valide: 'Validé', refuse: 'Refusé' })[s] ?? s;

export const rechercheStatutLabel = (s: string): string =>
	({
		active: 'Recherche active',
		recherche: 'En recherche',
		entreprise: 'En entreprise',
		archive: 'Archivé'
	})[s] ?? s;

export const candidatureLabel = (s: string): string =>
	({ envoyee: 'Envoyée', entretien: 'Entretien', refusee: 'Refusée' })[s] ?? s;

export function debounce<T extends (...args: never[]) => void>(fn: T, delay = 300): T {
	let timer: ReturnType<typeof setTimeout> | undefined;
	return ((...args: never[]) => {
		clearTimeout(timer);
		timer = setTimeout(() => fn(...args), delay);
	}) as T;
}

export function ageFromBirth(birth: string | null | undefined): number | null {
	if (!birth) return null;
	const d = new Date(birth);
	if (Number.isNaN(d.getTime())) return null;
	const now = new Date();
	let age = now.getFullYear() - d.getFullYear();
	const m = now.getMonth() - d.getMonth();
	if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
	return age;
}

// Famille de skill → couleur de puce, aligné sur l'ancien projet.
export const SKILL_TYPE_COLORS: Record<string, { bg: string; fg: string }> = {
	dev: { bg: C.blueLight, fg: C.blue },
	design: { bg: C.purpleLight, fg: C.purple },
	lang: { bg: C.accentLight, fg: C.accent },
	office: { bg: C.greenLight, fg: C.green },
	soft: { bg: C.orangeLight, fg: C.orange }
};
