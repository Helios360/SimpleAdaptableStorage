import { browser } from '$app/environment';

export type Theme = 'light' | 'dark';

function readInitial(): Theme {
	if (!browser) return 'light';
	const stored = localStorage.getItem('cs-theme');
	if (stored === 'light' || stored === 'dark') return stored;
	return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

let current = $state<Theme>(readInitial());

function apply(t: Theme) {
	if (!browser) return;
	document.documentElement.setAttribute('data-theme', t);
}

if (browser) apply(current);

export function theme() {
	return {
		get value() {
			return current;
		},
		toggle() {
			current = current === 'dark' ? 'light' : 'dark';
			if (browser) localStorage.setItem('cs-theme', current);
			apply(current);
		},
		set(t: Theme) {
			current = t;
			if (browser) localStorage.setItem('cs-theme', current);
			apply(current);
		}
	};
}
