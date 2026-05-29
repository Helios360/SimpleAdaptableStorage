<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import Button from '$lib/components/Button.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import { pushToast } from '$lib/stores/toast.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="cs-rec-offres">
	<div class="cs-rec-offres__head">
		<Button icon="+" onclick={() => pushToast("Création d'offre à venir", 'info')}>
			Publier une offre
		</Button>
	</div>
	{#each data.offres as o (o.id)}
		<Card padding="16px 20px" class="cs-rec-offres__row">
			<div class="cs-rec-offres__body">
				<p class="cs-rec-offres__name">{o.titre}</p>
				<p class="cs-rec-offres__sub">{o.lieu} · {o.date}</p>
			</div>
			<Badge label={o.type} color="var(--c-blue-light)" />
		</Card>
	{/each}
</div>

<style>
	.cs-rec-offres {
		max-width: 760px;
	}
	.cs-rec-offres__head {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		margin-bottom: 20px;
	}
	:global(.cs-rec-offres__row) {
		display: flex;
		align-items: center;
		gap: 14px;
		margin-bottom: 10px;
		flex-wrap: wrap;
	}
	.cs-rec-offres__body {
		flex: 1 1 200px;
		min-width: 0;
	}
	.cs-rec-offres__name {
		font-weight: 600;
		font-size: 14px;
		color: var(--c-text);
	}
	.cs-rec-offres__sub {
		font-size: 12px;
		color: var(--c-muted);
	}
</style>
