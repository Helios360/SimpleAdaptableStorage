<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import Button from '$lib/components/Button.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Empty from '$lib/components/Empty.svelte';
	import CandidatDetail from '$lib/components/CandidatDetail.svelte';
	import { invalidateAll } from '$app/navigation';
	import { initials } from '$lib/utils';
	import { pushToast } from '$lib/stores/toast.svelte';
	import { C } from '$lib/tokens';
	import type { PageData, LayoutData } from './$types';
	import type { CandidatView } from '$lib/components/CandidatDetail.svelte';

	let { data }: { data: PageData & LayoutData } = $props();
	let detail = $state<CandidatView | null>(null);

	const retenus = $derived(new Set(data.retenuIds));

	async function toggle(candidatId: number) {
		const fd = new FormData();
		fd.set('candidatId', String(candidatId));
		await fetch('?/toggle', { method: 'POST', body: fd });
		await invalidateAll();
		pushToast(retenus.has(candidatId) ? 'Profil retiré' : 'Profil retenu ⭐', retenus.has(candidatId) ? 'info' : 'success');
	}
</script>

<div class="cs-rec">
	{#if data.candidats.length === 0}
		<Empty
			icon="📚"
			title="Aucun profil validé"
			sub="Les profils apparaissent après validation par le CRE."
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
					{#if c.tosa}<Badge label="Tosa: {c.tosa}" color={C.purpleLight} textColor={C.purple} />{/if}
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
