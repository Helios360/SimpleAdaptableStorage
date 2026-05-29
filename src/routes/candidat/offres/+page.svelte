<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import Button from '$lib/components/Button.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Empty from '$lib/components/Empty.svelte';
	import { enhance } from '$app/forms';
	import { pushToast } from '$lib/stores/toast.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let q = $state('');
	let debounced = $state('');
	let timer: ReturnType<typeof setTimeout>;
	$effect(() => {
		clearTimeout(timer);
		const v = q;
		timer = setTimeout(() => (debounced = v), 250);
	});

	const filtered = $derived(
		data.offres.filter((o) =>
			[o.titre, o.entreprise, o.lieu].some((x) => x.toLowerCase().includes(debounced.toLowerCase()))
		)
	);
</script>

<div class="cs-offres">
	<input class="cs-offres__search" bind:value={q} placeholder="🔍 Rechercher…" />

	{#if filtered.length === 0}
		<Empty icon="💼" title="Aucune offre" sub={`Aucun résultat pour "${debounced}"`} />
	{:else}
		{#each filtered as o (o.id)}
			<Card padding="16px 20px" class="cs-offre">
				<div class="cs-offre__body">
					<p class="cs-offre__name">{o.titre}</p>
					<p class="cs-offre__sub">{o.entreprise} · {o.lieu} · {o.type}</p>
				</div>
				<Badge label={o.type} color="var(--c-blue-light)" />
				<form
					method="POST"
					action="?/apply"
					use:enhance={() =>
						async ({ update, result }) => {
							await update();
							if (result.type === 'success') {
								const ok = (result.data as { alreadyApplied?: boolean } | undefined)?.alreadyApplied !== true;
								pushToast(ok ? 'Candidature envoyée ✓' : 'Déjà candidaté', ok ? 'success' : 'info');
							}
						}}
				>
					<input type="hidden" name="offreId" value={o.id} />
					<Button size="sm" type="submit">Postuler</Button>
				</form>
			</Card>
		{/each}
	{/if}
</div>

<style>
	.cs-offres {
		max-width: 800px;
	}
	.cs-offres__search {
		width: 100%;
		padding: 10px 16px;
		border-radius: 10px;
		border: 1.5px solid var(--c-border);
		font-size: 14px;
		margin-bottom: 16px;
		outline: none;
	}
	:global(.cs-offre) {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 10px;
		flex-wrap: wrap;
	}
	.cs-offre__body {
		flex: 1 1 200px;
		min-width: 0;
	}
	.cs-offre__name {
		font-weight: 600;
		font-size: 14px;
		color: var(--c-text);
	}
	.cs-offre__sub {
		font-size: 12px;
		color: var(--c-muted);
		margin-top: 3px;
	}
</style>
