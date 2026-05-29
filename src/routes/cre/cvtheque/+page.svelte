<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import Button from '$lib/components/Button.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Empty from '$lib/components/Empty.svelte';
	import CandidatDetail from '$lib/components/CandidatDetail.svelte';
	import { initials } from '$lib/utils';
	import { pushToast } from '$lib/stores/toast.svelte';
	import { C } from '$lib/tokens';
	import type { PageData } from './$types';
	import type { CandidatView } from '$lib/components/CandidatDetail.svelte';

	let { data }: { data: PageData } = $props();

	let q = $state('');
	let debounced = $state('');
	let timer: ReturnType<typeof setTimeout>;
	$effect(() => {
		clearTimeout(timer);
		const v = q;
		timer = setTimeout(() => (debounced = v), 250);
	});

	let selected = $state(new Set<number>());
	let detail = $state<CandidatView | null>(null);

	const filtered = $derived(
		data.candidats.filter((c) =>
			[c.name, c.formation].some((x) => x.toLowerCase().includes(debounced.toLowerCase()))
		)
	);

	function toggle(id: number) {
		const n = new Set(selected);
		if (n.has(id)) n.delete(id);
		else n.add(id);
		selected = n;
	}

	function toggleAll() {
		selected = selected.size === filtered.length ? new Set() : new Set(filtered.map((c) => c.id));
	}

	function sendSelected() {
		pushToast(`${selected.size} profil(s) envoyés ✓`);
		selected = new Set();
	}
</script>

<div class="cs-cvth">
	{#if selected.size > 0}
		<div class="cs-cvth__head">
			<Button icon="📤" onclick={sendSelected}>
				Envoyer {selected.size} profil(s)
			</Button>
		</div>
	{/if}

	<input class="cs-cvth__search" bind:value={q} placeholder="🔍 Rechercher un candidat…" />

	<div class="cs-cvth__all">
		<input
			type="checkbox"
			id="all"
			checked={selected.size === filtered.length && filtered.length > 0}
			onchange={toggleAll}
		/>
		<label for="all">Tout sélectionner ({filtered.length})</label>
	</div>

	{#if filtered.length === 0}
		<Empty icon="📚" title="Aucun profil" sub={`Aucun résultat pour "${debounced}"`} />
	{:else}
		{#each filtered as c (c.id)}
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
					<Badge
						label={c.score != null ? `IA: ${c.score}/100` : 'Pas de test'}
						color={c.score != null ? C.blueLight : C.redLight}
						textColor={c.score != null ? C.blue : C.red}
					/>
					{#if c.tosa}<Badge label="Tosa: {c.tosa}" color={C.purpleLight} textColor={C.purple} />{/if}
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
	.cs-cvth__search {
		width: 100%;
		padding: 10px 16px;
		border-radius: 10px;
		border: 1.5px solid var(--c-border);
		font-size: 14px;
		margin-bottom: 12px;
		outline: none;
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
