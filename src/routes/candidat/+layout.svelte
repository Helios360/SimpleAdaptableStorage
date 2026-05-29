<script lang="ts">
	import AppShell from '$lib/components/AppShell.svelte';
	import { CANDIDAT_NAV } from '$lib/data/nav';
	import { page } from '$app/stores';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	const titles: Record<string, string> = {
		'/candidat': 'Tableau de bord',
		'/candidat/profile': 'Mon profil',
		'/candidat/cvs': 'Mes CVs',
		'/candidat/pitch': 'Vidéo pitch',
		'/candidat/tests': 'Tests IA',
		'/candidat/offres': 'Offres',
		'/candidat/candidatures': 'Candidatures',
		'/candidat/tosa': 'Certification Tosa'
	};

	let title = $derived(titles[$page.url.pathname] ?? 'CloudStudent');

	// Show a badge on Tests IA if the user hasn't taken it yet
	let nav = $derived(
		CANDIDAT_NAV.map((n) =>
			n.href === '/candidat/tests' && data.candidat && data.candidat.score == null
				? { ...n, badge: 1 }
				: n
		)
	);

	let notifs = $derived(
		data.candidat && data.candidat.score == null
			? [{ icon: '🧠', text: "Un test IA t'attend pour valider ton dossier." }]
			: []
	);
</script>

<AppShell user={data.user} {nav} {title} notifications={notifs}>
	{@render children()}
</AppShell>
