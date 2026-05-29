<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import Button from '$lib/components/Button.svelte';
	import Input from '$lib/components/Input.svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { scoreColor } from '$lib/utils';
	import { pushToast } from '$lib/stores/toast.svelte';
	import type { LayoutData } from '../$types';

	let { data }: { data: LayoutData } = $props();
	const c = $derived(data.candidat);

	type Phase = 'idle' | 'running' | 'done';
	// initial-snapshot of the persisted score is intentional — local phase is reset by the test flow itself
	// svelte-ignore state_referenced_locally
	let phase = $state<Phase>(data.candidat?.score != null ? 'done' : 'idle');
	let current = $state(0);
	let poste = $state('Développeur React');
	let loading = $state(false);
	// svelte-ignore state_referenced_locally
	let finalScore = $state<number | null>(data.candidat?.score ?? null);

	const QS = [
		{
			q: 'Différence entre props et state en React ?',
			opts: ['Props externe / State interne', 'Props interne / State externe', 'Aucune', "React n'a pas de state"]
		},
		{
			q: 'Qu’est-ce qu’un hook personnalisé ?',
			opts: ['Un composant', 'Une fonction réutilisable avec hooks', 'Un état global', 'Une classe']
		},
		{
			q: 'À quoi sert useEffect ?',
			opts: ['Gérer les effets de bord', 'Styler', 'Créer un context', 'Remplacer Redux']
		}
	];

	function start() {
		loading = true;
		setTimeout(() => {
			phase = 'running';
			loading = false;
		}, 1100);
	}

	async function answer() {
		if (current < QS.length - 1) {
			current += 1;
			return;
		}
		const sc = Math.floor(Math.random() * 20) + 72;
		const fd = new FormData();
		fd.set('score', String(sc));
		await fetch('?/submit', { method: 'POST', body: fd });
		finalScore = sc;
		phase = 'done';
		await invalidateAll();
		pushToast('Test terminé ! Score envoyé au CRE ✓');
	}

	async function retake() {
		const fd = new FormData();
		await fetch('?/reset', { method: 'POST', body: fd });
		await invalidateAll();
		phase = 'idle';
		current = 0;
	}
</script>

{#if phase === 'idle'}
	<div class="cs-test">
		<Card padding="24px">
			<p class="cs-test__lead">
				Test adapté au poste visé — compétences techniques + comportementales. Ton score remonte
				automatiquement au CRE.
			</p>
			<Input label="Poste visé" name="poste" bind:value={poste} />
			<div class="cs-test__cta">
				<Button fullWidth onclick={start} disabled={loading}>
					{loading ? 'Génération des questions…' : '🧠 Démarrer le test'}
				</Button>
			</div>
		</Card>
	</div>
{:else if phase === 'running'}
	<div class="cs-test">
		<h2 class="cs-test__title">Test en cours</h2>
		<p class="cs-test__sub">Question {current + 1}/{QS.length} · {poste}</p>
		<div class="cs-test__bar"><div style:width="{((current + 1) / QS.length) * 100}%"></div></div>
		<Card padding="24px">
			<p class="cs-test__q">{QS[current].q}</p>
			<div class="cs-test__opts">
				{#each QS[current].opts as o}
					<button class="cs-test__opt" onclick={answer}>{o}</button>
				{/each}
			</div>
		</Card>
	</div>
{:else}
	<div class="cs-test cs-test--center">
		<h2 class="cs-test__title">Résultat</h2>
		<Card padding="32px">
			<div class="cs-test__emoji">🎯</div>
			<div class="cs-test__score" style:color={scoreColor(finalScore)}>
				{finalScore}<small>/100</small>
			</div>
			<p class="cs-test__sub">Test {poste}</p>
			<div class="cs-test__cta">
				<Button fullWidth onclick={retake}>Refaire le test</Button>
			</div>
		</Card>
	</div>
{/if}

<style>
	.cs-test {
		max-width: 560px;
	}
	.cs-test--center {
		text-align: center;
		max-width: 480px;
	}
	.cs-test__title {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 20px;
		color: var(--c-navy);
		margin-bottom: 4px;
	}
	.cs-test__sub {
		color: var(--c-muted);
		font-size: 13px;
		margin-bottom: 20px;
	}
	.cs-test__lead {
		font-size: 14px;
		color: var(--c-sub);
		margin-bottom: 18px;
	}
	.cs-test__cta {
		margin-top: 16px;
	}
	.cs-test__bar {
		height: 4px;
		background: var(--c-bg);
		border-radius: 99px;
		margin-bottom: 24px;
		overflow: hidden;
	}
	.cs-test__bar div {
		height: 100%;
		background: var(--c-blue);
		transition: width 0.3s;
	}
	.cs-test__q {
		font-weight: 600;
		font-size: 15px;
		color: var(--c-text);
		margin-bottom: 18px;
		line-height: 1.5;
	}
	.cs-test__opts {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.cs-test__opt {
		padding: 12px 16px;
		text-align: left;
		border-radius: 10px;
		border: 1.5px solid var(--c-border);
		background: var(--c-card);
		cursor: pointer;
		font-size: 13px;
		color: var(--c-text);
		transition: border-color 0.12s;
	}
	.cs-test__opt:hover {
		border-color: var(--c-blue);
	}
	.cs-test__emoji {
		font-size: 56px;
		margin-bottom: 8px;
	}
	.cs-test__score {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: clamp(34px, 10vw, 44px);
	}
	.cs-test__score small {
		font-size: 22px;
	}
	@media (max-width: 540px) {
		.cs-test__title {
			font-size: 18px;
		}
		.cs-test__emoji {
			font-size: 44px;
		}
	}
</style>
