<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import Button from '$lib/components/Button.svelte';
	import Input from '$lib/components/Input.svelte';
	import Loader from '$lib/components/Loader.svelte';
	import { invalidateAll } from '$app/navigation';
	import { scoreColor } from '$lib/utils';
	import { pushToast } from '$lib/stores/toast.svelte';
	import type { LayoutData } from '../$types';

	interface Question {
		q: string;
		options: string[];
		answer: number;
	}
	type TestType = 'code' | 'logique' | 'psycho' | 'culture';

	let { data }: { data: LayoutData } = $props();

	const TYPES: { id: TestType; label: string }[] = [
		{ id: 'code', label: 'Code' },
		{ id: 'logique', label: 'Logique' },
		{ id: 'psycho', label: 'Psychotechnique' },
		{ id: 'culture', label: 'Culture générale' }
	];

	type Phase = 'idle' | 'running' | 'done';
	// svelte-ignore state_referenced_locally
	let phase = $state<Phase>(data.candidat?.score != null ? 'done' : 'idle');
	let poste = $state('Développeur React');
	let testType = $state<TestType>('code');
	let loading = $state(false);
	let usedFallback = $state(false);

	let questions = $state<Question[]>([]);
	let current = $state(0);
	let answers = $state<number[]>([]);
	// svelte-ignore state_referenced_locally
	let finalScore = $state<number | null>(data.candidat?.score ?? null);

	const answered = $derived(answers.filter((a) => a != null).length);

	async function start() {
		loading = true;
		try {
			const res = await fetch('/api/ai/generate-test', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ type: testType, poste, niveau: data.candidat?.formation })
			});
			if (!res.ok) throw new Error('generation failed');
			const out = (await res.json()) as { questions: Question[]; fallback: boolean };
			questions = out.questions;
			usedFallback = out.fallback;
			answers = new Array(questions.length).fill(null) as unknown as number[];
			current = 0;
			phase = 'running';
			if (out.fallback) pushToast('Questions hors-ligne (IA indisponible)', 'info');
		} catch {
			pushToast('Impossible de générer le test', 'error');
		} finally {
			loading = false;
		}
	}

	function choose(optIdx: number) {
		answers[current] = optIdx;
		answers = [...answers];
		if (current < questions.length - 1) current += 1;
	}

	function computeScore(): number {
		const correct = questions.reduce((n, q, i) => n + (answers[i] === q.answer ? 1 : 0), 0);
		return Math.round((correct / questions.length) * 100);
	}

	async function submit() {
		const sc = computeScore();
		const fd = new FormData();
		fd.set('score', String(sc));
		await fetch('?/submit', { method: 'POST', body: fd });
		finalScore = sc;
		phase = 'done';
		await invalidateAll();
		pushToast('Test terminé ! Score envoyé ✓', 'success');
	}

	function abandon() {
		phase = 'idle';
		questions = [];
		answers = [];
		current = 0;
	}

	const resultMessage = $derived(
		finalScore == null
			? ''
			: finalScore >= 80
				? '🎉 Excellent ! Ton profil est mis en avant auprès des recruteurs.'
				: finalScore >= 60
					? '👍 Bon résultat. Quelques points à consolider.'
					: '💪 À retravailler — relance le test après révision.'
	);
</script>

{#if phase === 'idle'}
	<div class="cs-test">
		<Card padding="24px">
			<p class="cs-test__lead">
				Test adapté au poste visé — compétences techniques + comportementales. Ton score remonte
				automatiquement et conditionne la validation de ton dossier.
			</p>
			<Input label="Poste visé" name="poste" bind:value={poste} />
			<div class="cs-test__types">
				<p class="cs-test__types-lab">Type de test</p>
				<div class="cs-test__chips">
					{#each TYPES as t}
						<button
							type="button"
							class="cs-test__chip"
							class:cs-test__chip--active={testType === t.id}
							onclick={() => (testType = t.id)}
						>
							{t.label}
						</button>
					{/each}
				</div>
			</div>
			<div class="cs-test__cta">
				{#if loading}
					<Loader block label="Génération des questions par l'IA…" />
				{:else}
					<Button fullWidth onclick={start} disabled={loading || !poste.trim()}>
						🧠 Démarrer le test
					</Button>
				{/if}
			</div>
		</Card>
	</div>
{:else if phase === 'running'}
	<div class="cs-test">
		<div class="cs-test__head">
			<h2 class="cs-test__title">Test en cours</h2>
			<Button size="sm" variant="ghost" onclick={abandon}>Abandonner</Button>
		</div>
		<p class="cs-test__sub">
			Question {current + 1}/{questions.length} · {poste}
			{#if usedFallback}· hors-ligne{/if}
			· {answered}/{questions.length} répondues
		</p>
		<div class="cs-test__bar">
			<div style:width="{((current + 1) / questions.length) * 100}%"></div>
		</div>
		<Card padding="24px">
			<p class="cs-test__q">{questions[current].q}</p>
			<div class="cs-test__opts">
				{#each questions[current].options as o, i}
					<button
						class="cs-test__opt"
						class:cs-test__opt--sel={answers[current] === i}
						onclick={() => choose(i)}
					>
						{o}
					</button>
				{/each}
			</div>
		</Card>
		<div class="cs-test__nav">
			<Button
				size="sm"
				variant="subtle"
				onclick={() => (current = Math.max(0, current - 1))}
				disabled={current === 0}
			>
				← Précédent
			</Button>
			{#if current < questions.length - 1}
				<Button size="sm" onclick={() => (current += 1)}>Suivant →</Button>
			{:else}
				<Button size="sm" onclick={submit} disabled={answered < questions.length}>
					Terminer le test
				</Button>
			{/if}
		</div>
	</div>
{:else}
	<div class="cs-test cs-test--center">
		<h2 class="cs-test__title">Résultat</h2>
		<Card padding="32px">
			<div class="cs-test__emoji">🎯</div>
			<div class="cs-test__score" style:color={scoreColor(finalScore)}>
				{finalScore}<small>/100</small>
			</div>
			<p class="cs-test__result">{resultMessage}</p>
			<p class="cs-test__locked">
				🔒 Le test ne peut être passé qu'une seule fois. Ton score est définitif.
			</p>
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
	.cs-test__head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
	}
	.cs-test__title {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 20px;
		color: var(--c-text);
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
	.cs-test__types {
		margin-top: 16px;
	}
	.cs-test__types-lab {
		font-size: 13px;
		font-weight: 600;
		color: var(--c-sub);
		margin-bottom: 8px;
	}
	.cs-test__chips {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}
	.cs-test__chip {
		padding: 7px 14px;
		border-radius: 8px;
		border: 1.5px solid var(--c-border);
		background: var(--c-card);
		color: var(--c-text);
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
	}
	.cs-test__chip--active {
		background: var(--c-blue);
		color: #fff;
		border-color: var(--c-blue);
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
	.cs-test__opt--sel {
		border-color: var(--c-blue);
		background: var(--c-blue-light);
		font-weight: 600;
	}
	.cs-test__nav {
		display: flex;
		justify-content: space-between;
		margin-top: 16px;
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
	.cs-test__result {
		font-size: 14px;
		color: var(--c-sub);
		margin-top: 12px;
	}
	.cs-test__locked {
		font-size: 13px;
		color: var(--c-muted);
		margin-top: 16px;
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
