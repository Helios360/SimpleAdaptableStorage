<script lang="ts">
	import AppShell from '$lib/components/AppShell.svelte';
	import { RECRUTEUR_NAV } from '$lib/data/nav';
	import { page } from '$app/stores';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	const titles: Record<string, string> = {
		'/recruteur': 'CVthèque',
		'/recruteur/retenus': 'Profils retenus',
		'/recruteur/offres': 'Mes offres'
	};
	let title = $derived(titles[$page.url.pathname] ?? 'CloudStudent');

	const nav = $derived(
		RECRUTEUR_NAV.map((n) =>
			n.href === '/recruteur/retenus' && data.retenuIds.length > 0
				? { ...n, badge: data.retenuIds.length }
				: n
		)
	);
</script>

<AppShell user={data.user} {nav} {title}>
	{@render children()}
</AppShell>
