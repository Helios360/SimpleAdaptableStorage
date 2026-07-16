<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Empty from '$lib/components/Empty.svelte';
	import BarChart from '$lib/components/BarChart.svelte';
	import CandidatDetail from '$lib/components/CandidatDetail.svelte';
	import { initials } from '$lib/utils';
	import { C } from '$lib/tokens';
	import type { PageData } from './$types';
	import type { CandidatView } from '$lib/components/CandidatDetail.svelte';

	let { data }: { data: PageData } = $props();

	const valides = $derived(data.candidats.filter((c) => c.statut === 'valide').length);
	const pending = $derived(data.candidats.filter((c) => c.statut === 'en_attente'));
	const refuses = $derived(data.candidats.filter((c) => c.statut === 'refuse').length);
	const tested = $derived(data.candidats.filter((c) => c.score != null).length);

	let detail = $state<CandidatView | null>(null);

	const stats = $derived([
		{ label: 'À valider', value: pending.length, color: C.orange, icon: '⏳' },
		{ label: 'Validés', value: valides, color: C.green, icon: '✓' },
		{ label: 'Tests passés', value: tested, color: C.blue, icon: '🧠' },
		{ label: 'Refusés', value: refuses, color: C.red, icon: '✕' }
	]);
</script>

<div class="cs-cre">
	<div class="cs-cre__stats">
		{#each stats as s}
			<Card padding="20px">
				<div class="cs-cre__stat-icon">{s.icon}</div>
				<div class="cs-cre__stat-val" style:color={s.color}>{s.value}</div>
				<div class="cs-cre__stat-lab">{s.label}</div>
			</Card>
		{/each}
	</div>

	<Card padding="22px" class="cs-cre__chart">
		<h3 class="cs-cre__section">📊 Répartition des dossiers</h3>
		<BarChart
			data={[
				{ label: 'À valider', value: pending.length },
				{ label: 'Validés', value: valides },
				{ label: 'Refusés', value: refuses }
			]}
		/>
	</Card>

	<Card padding="22px">
		<h3 class="cs-cre__section">⏳ Dossiers en attente</h3>
		{#if pending.length === 0}
			<Empty icon="✓" title="Tout est traité" sub="Aucun dossier en attente." />
		{:else}
			{#each pending as c (c.id)}
				<button class="cs-cre__row" onclick={() => (detail = c)}>
					<div class="cs-cre__avatar">{initials(c.name)}</div>
					<div class="cs-cre__row-body">
						<p class="cs-cre__row-name">{c.name}</p>
						<p class="cs-cre__row-sub">{c.formation}</p>
					</div>
					<Badge
						label={c.score != null ? `Score: ${c.score}` : 'Pas de test'}
						color={c.score != null ? (c.score >= 75 ? C.greenLight : C.orangeLight) : C.redLight}
						textColor={c.score != null ? (c.score >= 75 ? C.green : C.orange) : C.red}
					/>
				</button>
			{/each}
		{/if}
	</Card>
</div>

<CandidatDetail candidat={detail} open={!!detail} onclose={() => (detail = null)} />

<style>
	.cs-cre__stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(160px,1fr));
		gap: 14px;
		margin-bottom: 20px;
	}
	.cs-cre__stat-icon {
		font-size: 24px;
		margin-bottom: 6px;
	}
	.cs-cre__stat-val {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 26px;
	}
	.cs-cre__stat-lab {
		font-size: 12px;
		color: var(--c-muted);
		margin-top: 2px;
	}
	:global(.cs-cre__chart) {
		margin-bottom: 16px;
	}
	.cs-cre__section {
		font-family: var(--font-display);
		font-weight: 700;
		font-size: 15px;
		color: var(--c-text);
		margin-bottom: 16px;
	}
	.cs-cre__row {
		width: 100%;
		background: none;
		border: none;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 0;
		border-bottom: 1px solid var(--c-border);
		cursor: pointer;
		text-align: left;
		flex-wrap: wrap;
	}
	.cs-cre__avatar {
		width: 34px;
		height: 34px;
		border-radius: 10px;
		background: var(--c-blue-light);
		display: grid;
		place-items: center;
		font-weight: 700;
		font-size: 12px;
		color: var(--c-blue);
	}
	.cs-cre__row-body {
		flex: 1 1 160px;
		min-width: 0;
	}
	.cs-cre__row-name {
		font-weight: 600;
		font-size: 14px;
		color: var(--c-text);
	}
	.cs-cre__row-sub {
		font-size: 12px;
		color: var(--c-muted);
	}
</style>
