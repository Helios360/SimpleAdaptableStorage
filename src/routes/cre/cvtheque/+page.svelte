<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import Button from '$lib/components/Button.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Empty from '$lib/components/Empty.svelte';
	import CandidatDetail from '$lib/components/CandidatDetail.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { debounce } from '$lib/utils';
	import { C } from '$lib/tokens';
	import type { PageData } from './$types';
	import type { CandidatView } from '$lib/components/CandidatDetail.svelte';

	let { data }: { data: PageData } = $props();

	// Filtres pilotés côté serveur via la querystring (load() relit l'URL).
	// Snapshot initial volontaire : ces inputs sont resynchronisés par la navigation.
	// svelte-ignore state_referenced_locally
	let q = $state(data.filters.q);
	// svelte-ignore state_referenced_locally
	let minScore = $state(data.filters.minScore);
	// svelte-ignore state_referenced_locally
	let formationId = $state(data.filters.formationId);

	function applyFilters() {
		const params = new URLSearchParams();
		if (q.trim()) params.set('q', q.trim());
		if (minScore) params.set('minScore', minScore);
		if (formationId) params.set('formationId', formationId);
		const qs = params.toString();
		goto(qs ? `?${qs}` : $page.url.pathname, { keepFocus: true, noScroll: true });
	}
	const applyDebounced = debounce(applyFilters, 300);

	let selected = $state(new Set<number>());
	let detail = $state<CandidatView | null>(null);

	const candidats = $derived(data.candidats);

	function toggle(id: number) {
		const n = new Set(selected);
		if (n.has(id)) n.delete(id);
		else n.add(id);
		selected = n;
	}

	function toggleAll() {
		selected =
			selected.size === candidats.length ? new Set() : new Set(candidats.map((c) => c.id));
	}

	function sendSelected() {
		const ids = [...selected].join(',');
		goto(`/cre/envoi?students=${ids}`);
	}

	function resetFilters() {
		q = '';
		minScore = '';
		formationId = '';
		applyFilters();
	}
</script>

<div class="cs-cvth">
	{#if selected.size > 0}
		<div class="cs-cvth__head">
			<Button icon="📤" onclick={sendSelected}>
				Préparer un envoi · {selected.size} profil(s)
			</Button>
		</div>
	{/if}

	<div class="cs-cvth__filters">
		<input
			class="cs-cvth__search"
			bind:value={q}
			oninput={applyDebounced}
			placeholder="🔍 Nom ou formation…"
		/>
		<input
			class="cs-cvth__num"
			type="number"
			min="0"
			max="100"
			bind:value={minScore}
			oninput={applyDebounced}
			placeholder="Score IA min"
		/>
		<select class="cs-cvth__select" bind:value={formationId} onchange={applyFilters}>
			<option value="">Toutes formations</option>
			{#each data.formations as f}
				<option value={String(f.id)}>{f.name}</option>
			{/each}
		</select>
		<Button size="sm" variant="subtle" onclick={resetFilters}>Réinitialiser</Button>
	</div>

	<div class="cs-cvth__all">
		<input
			type="checkbox"
			id="all"
			checked={selected.size === candidats.length && candidats.length > 0}
			onchange={toggleAll}
		/>
		<label for="all">Tout sélectionner ({data.total})</label>
	</div>

	{#if candidats.length === 0}
		<Empty icon="📚" title="Aucun profil" sub="Aucun résultat pour ces filtres." />
	{:else}
		{#each candidats as c (c.id)}
			<Card padding="14px 18px" class="cs-cvth__row" style={selected.has(c.id) ? `border:2px solid ${C.blue};background:${C.blueSoft}` : ''}>
				<input
					type="checkbox"
					checked={selected.has(c.id)}
					onchange={() => toggle(c.id)}
					aria-label="Sélectionner {c.name}"
				/>
				<button class="cs-cvth__body" onclick={() => (detail = c)}>
					<p class="cs-cvth__name">{c.name}</p>
					<p class="cs-cvth__sub">{c.formation}</p>
				</button>
				<div class="cs-cvth__tags">
					<Badge label={`📄 ${c.cvs.length} CV`} color={C.bg} textColor={C.sub} />
					<Badge
						label={c.score != null ? `IA: ${c.score}/100` : 'Pas de test'}
						color={c.score != null ? C.blueLight : C.redLight}
						textColor={c.score != null ? C.blue : C.red}
					/>
					{#if c.pitch}<Badge label="🎥" color={C.greenLight} textColor={C.green} />{/if}
				</div>
			</Card>
		{/each}
	{/if}
</div>

<CandidatDetail candidat={detail} open={!!detail} onclose={() => (detail = null)} />

<style>
	.cs-cvth {
		max-width: 900px;
	}
	.cs-cvth__head {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		margin-bottom: 16px;
	}
	.cs-cvth__filters {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		margin-bottom: 14px;
	}
	.cs-cvth__search {
		flex: 1 1 220px;
		padding: 10px 16px;
		border-radius: 10px;
		border: 1.5px solid var(--c-border);
		font-size: 14px;
		outline: none;
	}
	.cs-cvth__num {
		width: 130px;
		padding: 10px 12px;
		border-radius: 10px;
		border: 1.5px solid var(--c-border);
		font-size: 14px;
		outline: none;
	}
	.cs-cvth__select {
		padding: 10px 12px;
		border-radius: 10px;
		border: 1.5px solid var(--c-border);
		font-size: 14px;
		outline: none;
		background: var(--c-card);
	}
	.cs-cvth__all {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 14px;
		font-size: 13px;
		color: var(--c-muted);
	}
	:global(.cs-cvth__row) {
		display: flex;
		align-items: center;
		gap: 14px;
		margin-bottom: 10px;
		flex-wrap: wrap;
	}
	.cs-cvth__body {
		background: none;
		border: none;
		text-align: left;
		flex: 1 1 200px;
		min-width: 0;
		cursor: pointer;
	}
	.cs-cvth__name {
		font-weight: 600;
		font-size: 14px;
		color: var(--c-text);
	}
	.cs-cvth__sub {
		font-size: 12px;
		color: var(--c-muted);
	}
	.cs-cvth__tags {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
	}
	@media (max-width: 540px) {
		:global(.cs-cvth__row) {
			gap: 10px;
		}
		.cs-cvth__tags {
			flex-basis: 100%;
		}
	}
</style>
