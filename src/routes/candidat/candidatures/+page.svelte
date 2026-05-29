<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Empty from '$lib/components/Empty.svelte';
	import { candidatureLabel } from '$lib/utils';
	import { C } from '$lib/tokens';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const colors: Record<string, { bg: string; fg: string }> = {
		envoyee: { bg: C.orangeLight, fg: C.orange },
		entretien: { bg: C.blueLight, fg: C.blue },
		refusee: { bg: C.redLight, fg: C.red }
	};
</script>

<div class="cs-cand">
	{#if data.rows.length === 0}
		<Empty icon="📮" title="Aucune candidature" sub="Postulez depuis l'onglet Offres." />
	{:else}
		{#each data.rows as r}
			{@const s = colors[r.statut] ?? { bg: C.bg, fg: C.muted }}
			<Card padding="16px 20px" class="cs-cand__row">
				<div class="cs-cand__body">
					<p class="cs-cand__name">{r.titre}</p>
					<p class="cs-cand__sub">{r.entreprise} · {new Date(r.date).toLocaleDateString('fr-FR')}</p>
				</div>
				<Badge label={candidatureLabel(r.statut)} color={s.bg} textColor={s.fg} />
			</Card>
		{/each}
	{/if}
</div>

<style>
	.cs-cand {
		max-width: 700px;
	}
	:global(.cs-cand__row) {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 10px;
		flex-wrap: wrap;
	}
	.cs-cand__body {
		flex: 1 1 200px;
		min-width: 0;
	}
	.cs-cand__name {
		font-weight: 600;
		font-size: 14px;
		color: var(--c-text);
	}
	.cs-cand__sub {
		font-size: 12px;
		color: var(--c-muted);
		margin-top: 3px;
	}
</style>
