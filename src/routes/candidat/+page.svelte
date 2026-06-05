<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import Button from '$lib/components/Button.svelte';
	import { scoreColor, statutLabel } from '$lib/utils';
	import { C } from '$lib/tokens';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const c = $derived(data.candidat);
	const firstName = $derived(data.user.name.split(' ')[0]);

	const steps = $derived([
		{ label: 'Profil complété', done: !!c },
		{ label: 'CV déposé', done: data.cvCount > 0 },
		{ label: 'Vidéo pitch', done: !!c?.pitch },
		{ label: 'Test IA réalisé', done: c?.score != null },
		{ label: 'Dossier validé', done: c?.statut === 'valide' }
	]);

	const progress = $derived(Math.round((steps.filter((s) => s.done).length / steps.length) * 100));

	const statutBg = (s: string) =>
		s === 'valide' ? C.green : s === 'refuse' ? C.red : C.orange;
</script>

<div class="cs-dash">
	<h1 class="cs-dash__hi">Bonjour, {firstName} 👋</h1>
	<p class="cs-dash__sub">{c?.formation ?? '—'} · {data.user.school ?? 'AJ-formation'}</p>

	<Card padding="22px">
		<div class="cs-dash__progress-head">
			<span class="cs-dash__progress-title">Progression du dossier</span>
			<span class="cs-dash__progress-val">{progress}%</span>
		</div>
		<div class="cs-dash__bar"><div style:width="{progress}%"></div></div>
		<div class="cs-dash__steps">
			{#each steps as s}
				<div class="cs-dash__step" style:color={s.done ? C.green : C.muted}>
					<span>{s.done ? '✓' : '○'}</span>{s.label}
				</div>
			{/each}
		</div>
	</Card>

	<div class="cs-dash__stats">
		<Card padding="18px">
			<div class="cs-dash__stat-icon">🧠</div>
			<div class="cs-dash__stat-val" style:color={scoreColor(c?.score ?? null)}>
				{c?.score != null ? `${c.score}/100` : '—'}
			</div>
			<div class="cs-dash__stat-lab">Score IA</div>
		</Card>
		<Card padding="18px">
			<div class="cs-dash__stat-icon">📄</div>
			<div class="cs-dash__stat-val" style:color={C.green}>{data.cvCount}</div>
			<div class="cs-dash__stat-lab">CVs</div>
		</Card>
		<Card padding="18px">
			<div class="cs-dash__stat-icon">📮</div>
			<div class="cs-dash__stat-val" style:color={C.blue}>{data.appCount}</div>
			<div class="cs-dash__stat-lab">Candidatures</div>
		</Card>
		<Card padding="18px">
			<div class="cs-dash__stat-icon">🗓️</div>
			<div class="cs-dash__stat-val" style:color={C.purple}>{data.entretienCount}</div>
			<div class="cs-dash__stat-lab">Entretiens</div>
		</Card>
		<Card padding="18px">
			<div class="cs-dash__stat-icon">📋</div>
			<div class="cs-dash__stat-val cs-dash__stat-val--small" style:color={statutBg(c?.statut ?? 'en_attente')}>
				{statutLabel(c?.statut ?? 'en_attente')}
			</div>
			<div class="cs-dash__stat-lab">Statut</div>
		</Card>
	</div>

	{#if c && c.score == null}
		<div class="cs-dash__alert">
			<span class="cs-dash__alert-icon">⚠️</span>
			<div class="cs-dash__alert-body">
				<p class="cs-dash__alert-title">Test IA obligatoire</p>
				<p class="cs-dash__alert-sub">
					Ton dossier ne peut pas être validé sans test IA.
				</p>
			</div>
			<Button size="sm" onclick={() => (window.location.href = '/candidat/tests')}>
				Passer le test
			</Button>
		</div>
	{/if}
</div>

<style>
	.cs-dash {
		max-width: 900px;
	}
	.cs-dash__hi {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 22px;
		color: var(--c-text);
		margin-bottom: 4px;
	}
	.cs-dash__sub {
		color: var(--c-muted);
		font-size: 14px;
		margin-bottom: 24px;
	}
	.cs-dash__progress-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 12px;
	}
	.cs-dash__progress-title {
		font-family: var(--font-display);
		font-weight: 700;
		font-size: 14px;
		color: var(--c-text);
	}
	.cs-dash__progress-val {
		font-size: 14px;
		font-weight: 700;
		color: var(--c-blue);
	}
	.cs-dash__bar {
		height: 8px;
		background: var(--c-bg);
		border-radius: 99px;
		overflow: hidden;
		margin-bottom: 16px;
	}
	.cs-dash__bar div {
		height: 100%;
		background: var(--c-blue);
		border-radius: 99px;
		transition: width 0.6s ease;
	}
	.cs-dash__steps {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.cs-dash__step {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
	}
	.cs-dash__stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
		gap: 14px;
		margin: 20px 0;
	}
	.cs-dash__stat-icon {
		font-size: 22px;
		margin-bottom: 4px;
	}
	.cs-dash__stat-val {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: clamp(18px, 4vw, 22px);
		overflow-wrap: anywhere;
		line-height: 1.1;
	}
	.cs-dash__stat-val--small {
		font-size: 16px;
	}
	.cs-dash__stat-lab {
		font-size: 12px;
		color: var(--c-muted);
		margin-top: 2px;
	}
	.cs-dash__alert {
		background: var(--c-orange-light);
		border: 1px solid color-mix(in srgb, var(--c-orange) 33%, transparent);
		border-radius: 12px;
		padding: 16px 20px;
		display: flex;
		align-items: center;
		gap: 14px;
		flex-wrap: wrap;
	}
	.cs-dash__alert-icon {
		font-size: 22px;
	}
	.cs-dash__alert-body {
		flex: 1 1 200px;
		min-width: 0;
	}
	.cs-dash__alert-title {
		font-weight: 700;
		font-size: 14px;
		color: var(--c-orange-text);
	}
	.cs-dash__alert-sub {
		font-size: 12px;
		color: var(--c-orange-text);
		margin-top: 2px;
	}
	@media (max-width: 540px) {
		.cs-dash__hi {
			font-size: 20px;
		}
		.cs-dash__stats {
			grid-template-columns: 1fr 1fr;
			gap: 10px;
		}
	}
</style>
