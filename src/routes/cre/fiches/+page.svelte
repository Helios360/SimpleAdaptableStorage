<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import Button from '$lib/components/Button.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import { pushToast } from '$lib/stores/toast.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="cs-fiches">
	<div class="cs-fiches__head">
		<Button icon="+" onclick={() => pushToast('Création de fiche à venir', 'info')}>
			Créer une fiche
		</Button>
	</div>
	{#each data.offres as o (o.id)}
		<Card padding="16px 20px" class="cs-fiches__row">
			<div class="cs-fiches__body">
				<p class="cs-fiches__name">{o.titre}</p>
				<p class="cs-fiches__sub">{o.entreprise}</p>
			</div>
			<Badge label={o.type} color="var(--c-blue-light)" />
			<Button size="sm" onclick={() => pushToast('Proposition envoyée ✓')}>Proposer</Button>
		</Card>
	{/each}
</div>

<style>
	.cs-fiches {
		max-width: 760px;
	}
	.cs-fiches__head {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		margin-bottom: 20px;
	}
	:global(.cs-fiches__row) {
		display: flex;
		align-items: center;
		gap: 14px;
		margin-bottom: 10px;
		flex-wrap: wrap;
	}
	.cs-fiches__body {
		flex: 1 1 200px;
		min-width: 0;
	}
	.cs-fiches__name {
		font-weight: 600;
		font-size: 14px;
		color: var(--c-text);
	}
	.cs-fiches__sub {
		font-size: 12px;
		color: var(--c-muted);
	}
</style>
