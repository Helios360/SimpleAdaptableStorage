<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import Button from '$lib/components/Button.svelte';
	import Empty from '$lib/components/Empty.svelte';
	import { invalidateAll } from '$app/navigation';
	import { initials } from '$lib/utils';
	import { pushToast } from '$lib/stores/toast.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	async function remove(candidatId: number) {
		const fd = new FormData();
		fd.set('candidatId', String(candidatId));
		await fetch('?/remove', { method: 'POST', body: fd });
		await invalidateAll();
		pushToast('Profil retiré', 'info');
	}
</script>

<div class="cs-ret">
	{#if data.candidats.length === 0}
		<Empty icon="⭐" title="Aucun profil retenu" sub="Retenez des profils depuis la CVthèque." />
	{:else}
		{#each data.candidats as c (c.id)}
			<Card padding="16px 20px" class="cs-ret__row">
				<div class="cs-ret__avatar">{initials(c.name)}</div>
				<div class="cs-ret__body">
					<p class="cs-ret__name">{c.name}</p>
					<p class="cs-ret__sub">{c.formation} · {c.city}</p>
				</div>
				<Button size="sm" onclick={() => pushToast('Email copié')}>Contacter</Button>
				<Button size="sm" variant="danger" onclick={() => remove(c.id)}>Retirer</Button>
			</Card>
		{/each}
	{/if}
</div>

<style>
	.cs-ret {
		max-width: 800px;
	}
	:global(.cs-ret__row) {
		display: flex;
		align-items: center;
		gap: 14px;
		margin-bottom: 10px;
		flex-wrap: wrap;
	}
	.cs-ret__avatar {
		width: 38px;
		height: 38px;
		border-radius: 10px;
		background: var(--c-green-light);
		display: grid;
		place-items: center;
		font-weight: 700;
		color: var(--c-green);
		font-size: 12px;
	}
	.cs-ret__body {
		flex: 1 1 200px;
		min-width: 0;
	}
	.cs-ret__name {
		font-weight: 600;
		font-size: 14px;
		color: var(--c-text);
	}
	.cs-ret__sub {
		font-size: 12px;
		color: var(--c-muted);
	}
</style>
