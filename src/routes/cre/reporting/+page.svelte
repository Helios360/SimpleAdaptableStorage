<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import BarChart from '$lib/components/BarChart.svelte';
	import { scoreColor, statutLabel } from '$lib/utils';
	import { C } from '$lib/tokens';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const s = $derived(data.stats);

	const bars = $derived([
		{ label: 'Validés', value: s.valides },
		{ label: 'Tests faits', value: s.testsDone },
		{ label: 'En recherche', value: s.enRecherche }
	]);

	function pct(n: number): number {
		return s.total ? Math.round((n / s.total) * 100) : 0;
	}

	const indicators = $derived([
		{ label: 'Dossiers validés', value: s.valides, pct: pct(s.valides), color: C.green },
		{ label: 'Tests IA passés', value: s.testsDone, pct: pct(s.testsDone), color: C.blue },
		{ label: 'En recherche active', value: s.enRecherche, pct: pct(s.enRecherche), color: C.purple }
	]);
</script>

<div class="cs-report">
	<div class="cs-report__stats">
		<Card padding="18px"><div class="cs-report__stat-val">{s.total}</div><div class="cs-report__stat-lab">Étudiants</div></Card>
		<Card padding="18px"><div class="cs-report__stat-val">{s.testsDone}</div><div class="cs-report__stat-lab">Tests faits</div></Card>
		<Card padding="18px"><div class="cs-report__stat-val">{s.envois}</div><div class="cs-report__stat-lab">Envois</div></Card>
		<Card padding="18px"><div class="cs-report__stat-val">{s.valides}</div><div class="cs-report__stat-lab">Validés</div></Card>
	</div>

	<Card padding="22px">
		<p class="cs-report__section">Répartition</p>
		<BarChart data={bars} />
	</Card>

	<Card padding="22px">
		<p class="cs-report__section">Indicateurs clés</p>
		{#each indicators as ind}
			<div class="cs-report__ind">
				<div class="cs-report__ind-head">
					<span>{ind.label}</span>
					<span>{ind.value} · {ind.pct}%</span>
				</div>
				<div class="cs-report__bar"><div style:width="{ind.pct}%" style:background={ind.color}></div></div>
			</div>
		{/each}
	</Card>

	<Card padding="0">
		<table class="cs-report__table">
			<thead>
				<tr><th>Étudiant</th><th>Formation</th><th>Score IA</th><th>Statut</th><th>Candidatures</th></tr>
			</thead>
			<tbody>
				{#each data.rows as r (r.id)}
					<tr>
						<td>{r.name}</td>
						<td class="cs-report__muted">{r.formation}</td>
						<td style:color={scoreColor(r.score)} style:font-weight="700">
							{r.score != null ? `${r.score}/100` : '—'}
						</td>
						<td><Badge label={statutLabel(r.statut)} /></td>
						<td>{r.apps}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</Card>
</div>

<style>
	.cs-report {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}
	.cs-report__title {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 22px;
		color: var(--c-text);
	}
	.cs-report__stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: 14px;
	}
	.cs-report__stat-val {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 26px;
		color: var(--c-text);
	}
	.cs-report__stat-lab {
		font-size: 12px;
		color: var(--c-muted);
		margin-top: 2px;
	}
	.cs-report__section {
		font-family: var(--font-display);
		font-weight: 700;
		font-size: 14px;
		color: var(--c-text);
		margin-bottom: 16px;
	}
	.cs-report__ind {
		margin-bottom: 14px;
	}
	.cs-report__ind-head {
		display: flex;
		justify-content: space-between;
		font-size: 13px;
		color: var(--c-sub);
		margin-bottom: 6px;
	}
	.cs-report__bar {
		height: 8px;
		background: var(--c-bg);
		border-radius: 99px;
		overflow: hidden;
	}
	.cs-report__bar div {
		height: 100%;
		border-radius: 99px;
		transition: width 0.6s ease;
	}
	.cs-report__table {
		width: 100%;
		border-collapse: collapse;
		font-size: 13px;
	}
	.cs-report__table th,
	.cs-report__table td {
		text-align: left;
		padding: 12px 16px;
		border-bottom: 1px solid var(--c-border);
	}
	.cs-report__table th {
		font-size: 12px;
		color: var(--c-muted);
		font-weight: 600;
	}
	.cs-report__muted {
		color: var(--c-muted);
	}
	@media (max-width: 540px) {
		.cs-report__table {
			font-size: 12px;
		}
		.cs-report__table th,
		.cs-report__table td {
			padding: 8px 10px;
		}
	}
</style>
