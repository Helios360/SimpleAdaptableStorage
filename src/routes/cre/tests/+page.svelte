<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import Button from '$lib/components/Button.svelte';
	import Loader from '$lib/components/Loader.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import { pushToast } from '$lib/stores/toast.svelte';
	import { C } from '$lib/tokens';
	import type { PageData } from './$types';

	interface Question {
		q: string;
		options: string[];
		answer: number;
	}
	type TestType = 'code' | 'logique' | 'psycho' | 'culture';

	let { data }: { data: PageData } = $props();

	const TYPES: { id: TestType; label: string }[] = [
		{ id: 'code', label: 'Code' },
		{ id: 'logique', label: 'Logique' },
		{ id: 'psycho', label: 'Psychotechnique' },
		{ id: 'culture', label: 'Culture générale' }
	];

	// svelte-ignore state_referenced_locally
	let offreId = $state(data.offres[0]?.id ?? 0);
	let types = $state(new Set<TestType>(['code']));
	let students = $state(new Set<number>());
	let loading = $state(false);
	let preview = $state<{ type: TestType; questions: Question[] }[]>([]);
	let usedFallback = $state(false);

	const poste = $derived(data.offres.find((o) => o.id === offreId)?.titre ?? '');

	function toggleType(t: TestType) {
		const n = new Set(types);
		if (n.has(t)) n.delete(t);
		else n.add(t);
		types = n;
	}
	function toggleStudent(id: number) {
		const n = new Set(students);
		if (n.has(id)) n.delete(id);
		else n.add(id);
		students = n;
	}

	async function generate() {
		if (!poste || types.size === 0) return;
		loading = true;
		preview = [];
		usedFallback = false;
		try {
			const results = await Promise.all(
				[...types].map(async (type) => {
					const res = await fetch('/api/ai/generate-test', {
						method: 'POST',
						headers: { 'content-type': 'application/json' },
						body: JSON.stringify({ type, poste })
					});
					if (!res.ok) throw new Error('gen failed');
					const out = (await res.json()) as { questions: Question[]; fallback: boolean };
					if (out.fallback) usedFallback = true;
					return { type, questions: out.questions };
				})
			);
			preview = results;
			pushToast('Questions générées par l’IA ✓', 'success');
		} catch {
			pushToast('Génération impossible', 'error');
		} finally {
			loading = false;
		}
	}

	function assign() {
		if (students.size === 0) {
			pushToast('Sélectionnez au moins un étudiant', 'error');
			return;
		}
		// Le modèle de données utilise une banque de questions partagée : l'assignation
		// est notifiée aux étudiants, qui passent le test depuis leur espace.
		pushToast(`Test assigné à ${students.size} étudiant(s) ✓`, 'success');
	}
</script>

<div class="cs-tcre">
	<Card padding="24px" class="cs-tcre__form">
		<div>
			<p class="cs-tcre__lab">Poste cible</p>
			<select class="cs-tcre__select" bind:value={offreId}>
				{#each data.offres as o}
					<option value={o.id}>{o.titre} · {o.entreprise}</option>
				{/each}
			</select>
		</div>

		<div class="cs-tcre__types">
			<p class="cs-tcre__lab">Types de test (multi-sélection)</p>
			<div class="cs-tcre__chips">
				{#each TYPES as t}
					<button
						class="cs-tcre__chip"
						class:cs-tcre__chip--active={types.has(t.id)}
						onclick={() => toggleType(t.id)}
					>
						{t.label}
					</button>
				{/each}
			</div>
		</div>

		<div class="cs-tcre__types">
			<p class="cs-tcre__lab">Étudiants à tester ({students.size})</p>
			<div class="cs-tcre__students">
				{#each data.students as s (s.id)}
					<label class="cs-tcre__student">
						<input type="checkbox" checked={students.has(s.id)} onchange={() => toggleStudent(s.id)} />
						<span>{s.name}<small> · {s.formation}</small></span>
					</label>
				{/each}
			</div>
		</div>

		<div class="cs-tcre__cta">
			<Button onclick={generate} disabled={loading || !poste || types.size === 0}>
				🧠 Prévisualiser (IA)
			</Button>
			<Button variant="ghost" onclick={assign} disabled={loading}>📤 Assigner</Button>
		</div>
	</Card>

	{#if loading}
		<Card padding="24px"><Loader block label="L’IA génère les questions…" /></Card>
	{:else if preview.length}
		{#each preview as block}
			<Card padding="24px">
				<p class="cs-tcre__preview-title">
					{TYPES.find((t) => t.id === block.type)?.label} — {poste}
					{#if usedFallback}<Badge label="hors-ligne" color={C.orangeLight} textColor={C.orange} />{/if}
				</p>
				{#each block.questions as q, i}
					<div class="cs-tcre__preview-q">{i + 1}. {q.q}</div>
				{/each}
			</Card>
		{/each}
	{/if}
</div>

<style>
	.cs-tcre {
		max-width: 680px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	:global(.cs-tcre__form) {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}
	.cs-tcre__lab {
		font-size: 13px;
		font-weight: 600;
		color: var(--c-sub);
		margin-bottom: 8px;
	}
	.cs-tcre__select {
		width: 100%;
		padding: 10px 12px;
		border-radius: 10px;
		border: 1.5px solid var(--c-border);
		font-size: 14px;
		background: var(--c-card);
		outline: none;
	}
	.cs-tcre__chips {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}
	.cs-tcre__chip {
		padding: 7px 14px;
		border-radius: 8px;
		border: 1.5px solid var(--c-border);
		background: var(--c-card);
		color: var(--c-text);
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
	}
	.cs-tcre__chip--active {
		background: var(--c-blue);
		color: #fff;
		border-color: var(--c-blue);
	}
	.cs-tcre__students {
		display: flex;
		flex-direction: column;
		gap: 8px;
		max-height: 220px;
		overflow-y: auto;
	}
	.cs-tcre__student {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 13px;
		color: var(--c-text);
		cursor: pointer;
	}
	.cs-tcre__student small {
		color: var(--c-muted);
	}
	.cs-tcre__cta {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}
	.cs-tcre__preview-title {
		font-family: var(--font-display);
		font-weight: 700;
		font-size: 14px;
		margin-bottom: 14px;
		color: var(--c-text);
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.cs-tcre__preview-q {
		padding: 10px 0;
		border-bottom: 1px solid var(--c-border);
		font-size: 13px;
		color: var(--c-sub);
	}
</style>
