<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import Button from '$lib/components/Button.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Empty from '$lib/components/Empty.svelte';
	import { pushToast } from '$lib/stores/toast.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="cs-rec-offres">
	<div class="cs-rec-offres__head">
		<div class="cs-rec-offres__title">
			<p class="cs-rec-offres__company">{data.company ?? 'Mon entreprise'}</p>
			<p class="cs-rec-offres__count">{data.offres.length} offre(s) publiée(s)</p>
		</div>
		<Button icon="+" onclick={() => pushToast("Publication d'offre via votre CRE référent", 'info')}>
			Publier une offre
		</Button>
	</div>

	{#if data.offres.length === 0}
		<Empty
			icon="📣"
			title="Aucune offre publiée"
			sub="Contactez votre CRE référent pour diffuser une offre auprès des candidats."
		/>
	{:else}
		{#each data.offres as o (o.id)}
			<Card padding="16px 20px" class="cs-rec-offres__row">
				<div class="cs-rec-offres__body">
					<p class="cs-rec-offres__name">{o.titre}</p>
					<p class="cs-rec-offres__sub">{o.lieu} · {o.date}</p>
				</div>
				<Badge label={o.type} color="var(--c-blue-light)" />
			</Card>
		{/each}
	{/if}
</div>

<style>
	.cs-rec-offres {
		max-width: 760px;
	}
	.cs-rec-offres__head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
		margin-bottom: 20px;
	}
	.cs-rec-offres__company {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 16px;
		color: var(--c-text);
	}
	.cs-rec-offres__count {
		font-size: 12px;
		color: var(--c-muted);
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
