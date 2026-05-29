<script lang="ts">
	import AppShell from '$lib/components/AppShell.svelte';
	import { CRE_NAV } from '$lib/data/nav';
	import { page } from '$app/stores';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	const titles: Record<string, string> = {
		'/cre': 'Dashboard CRE',
		'/cre/etudiants': 'Étudiants',
		'/cre/cvtheque': 'CVthèque',
		'/cre/tests': 'Tests IA',
		'/cre/envoi': 'Envoi groupé',
		'/cre/messages': 'Réponses clients',
		'/cre/fiches': 'Fiches de poste'
	};
	let title = $derived(titles[$page.url.pathname] ?? 'CloudStudent');
</script>

<AppShell user={data.user} nav={CRE_NAV} {title}>
	{@render children()}
</AppShell>
