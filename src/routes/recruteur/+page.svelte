<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import Button from '$lib/components/Button.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Empty from '$lib/components/Empty.svelte';
	import CandidatDetail from '$lib/components/CandidatDetail.svelte';
	import { invalidateAll, goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { initials, debounce } from '$lib/utils';
	import { pushToast } from '$lib/stores/toast.svelte';
	import { C } from '$lib/tokens';
	import type { PageData, LayoutData } from './$types';
	import type { CandidatView } from '$lib/components/CandidatDetail.svelte';

	let { data }: { data: PageData & LayoutData } = $props();
	let detail = $state<CandidatView | null>(null);

	const retenus = $derived(new Set(data.retenuIds));

	// svelte-ignore state_referenced_locally
	let q = $state(data.filters.q);
	// svelte-ignore state_referenced_locally
	let minScore = $state(data.filters.minScore);

	function applyFilters() {
		const params = new URLSearchParams();
		if (q.trim()) params.set('q', q.trim());
		if (minScore) params.set('minScore', minScore);
		const qs = params.toString();
		goto(qs ? `?${qs}` : $page.url.pathname, { keepFocus: true, noScroll: true });
	}
	const applyDebounced = debounce(applyFilters, 300);

	async function toggle(candidatId: number) {
		const fd = new FormData();
		fd.set('candidatId', String(candidatId));
		await fetch('?/toggle', { method: 'POST', body: fd });
		await invalidateAll();
		pushToast(retenus.has(candidatId) ? 'Profil retiré' : 'Profil retenu ⭐', retenus.has(candidatId) ? 'info' : 'success');
	}
</script>

<div class="cs-rec">
	<div class="cs-rec__filters">
		<input
			class="cs-rec__search"
			bind:value={q}
			oninput={applyDebounced}
			placeholder="🔍 Nom ou formation…"
		/>
		<input
			class="cs-rec__num"
			type="number"
			min="0"
			max="100"
			bind:value={minScore}
			oninput={applyDebounced}
			placeholder="Score IA min"
		/>
	</div>

	{#if data.candidats.length === 0}
		<Empty
			icon="📚"
			title="Aucun profil validé"
			sub="Aucun candidat ne correspond à ces filtres."
		/>
	{:else}
		{#each data.candidats as c (c.id)}
			<Card padding="16px 20px" class="cs-rec__row">
				<button class="cs-rec__avatar-btn" onclick={() => (detail = c)}>
					<div class="cs-rec__avatar">{initials(c.name)}</div>
				</button>
				<button class="cs-rec__body" onclick={() => (detail = c)}>
					<p class="cs-rec__name">{c.name}</p>
					<p class="cs-rec__sub">{c.formation}</p>
				</button>
				<div class="cs-rec__tags">
					<Badge label="IA: {c.score}/100" color={C.blueLight} />
					{#if c.pitch}<Badge label="🎥" color={C.greenLight} textColor={C.green} />{/if}
				</div>
				<Button
					size="sm"
					variant={retenus.has(c.id) ? 'subtle' : 'ghost'}
					onclick={() => toggle(c.id)}
				>
					{retenus.has(c.id) ? '⭐ Retenu' : 'Retenir'}
				</Button>
			</Card>
		{/each}
	{/if}
</div>

<CandidatDetail candidat={detail} open={!!detail} onclose={() => (detail = null)}>
	{#snippet footer()}
		{#if detail}
			{@const d = detail}
			<Button
				fullWidth
				variant={retenus.has(d.id) ? 'subtle' : 'primary'}
				onclick={() => toggle(d.id)}
			>
				{retenus.has(d.id) ? '⭐ Déjà retenu' : '⭐ Retenir ce profil'}
			</Button>
		{/if}
	{/snippet}
</CandidatDetail>

<style>
	.cs-rec {
		max-width: 800px;
	}
	.cs-rec__filters {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		margin-bottom: 16px;
	}
	.cs-rec__search {
		flex: 1 1 220px;
		padding: 10px 16px;
		border-radius: 10px;
		border: 1.5px solid var(--c-border);
		font-size: 14px;
		outline: none;
	}
	.cs-rec__num {
		width: 130px;
		padding: 10px 12px;
		border-radius: 10px;
		border: 1.5px solid var(--c-border);
		font-size: 14px;
		outline: none;
	}
	:global(.cs-rec__row) {
		display: flex;
		align-items: center;
		gap: 14px;
		margin-bottom: 10px;
		flex-wrap: wrap;
	}
	.cs-rec__avatar-btn,
	.cs-rec__body {
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		text-align: left;
	}
	.cs-rec__body {
		flex: 1 1 180px;
		min-width: 0;
	}
	.cs-rec__avatar {
		width: 38px;
		height: 38px;
		border-radius: 10px;
		background: var(--c-blue-light);
		display: grid;
		place-items: center;
		font-weight: 700;
		color: var(--c-blue);
		font-size: 12px;
	}
	.cs-rec__name {
		font-weight: 600;
		font-size: 14px;
		color: var(--c-text);
	}
	.cs-rec__sub {
		font-size: 12px;
		color: var(--c-muted);
	}
	.cs-rec__tags {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
	}
</style>
