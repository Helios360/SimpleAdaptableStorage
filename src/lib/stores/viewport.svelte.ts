import { browser } from '$app/environment';

let width = $state(browser ? window.innerWidth : 1200);

if (browser) {
	window.addEventListener('resize', () => {
		width = window.innerWidth;
	});
}

export function viewportWidth() {
	return {
		get value() {
			return width;
		},
		get isMobile() {
			return width < 768;
		}
	};
}
