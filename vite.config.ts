/// <reference types="vitest" />
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		port: 3000,
		host: '0.0.0.0'
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		exclude: ['node_modules', '.svelte-kit', 'build', 'e2e/**'],
		environment: 'node',
		environmentMatchGlobs: [
			['src/lib/components/**', 'jsdom'],
			['src/**/*.dom.test.ts', 'jsdom']
		],
		globals: false,
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html', 'lcov'],
			include: ['src/lib/**/*.{ts,svelte}'],
			exclude: ['src/lib/server/db/migrations/**', '**/*.d.ts']
		}
	}
});
