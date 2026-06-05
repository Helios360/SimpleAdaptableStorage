<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import Button from '$lib/components/Button.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Input from '$lib/components/Input.svelte';
	import Empty from '$lib/components/Empty.svelte';
	import { enhance } from '$app/forms';
	import { pushToast } from '$lib/stores/toast.svelte';
	import { C } from '$lib/tokens';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let showForm = $state(false);
	let creating = $state(false);

	function fmtDate(d: string): string {
		const date = new Date(d);
		return Number.isNaN(date.getTime())
			? d
			: date.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'long' });
	}
</script>

<div class="cs-events">
	<div class="cs-events__head">
		<h2 class="cs-events__h">Événements ({data.events.length})</h2>
		<Button icon="+" onclick={() => (showForm = true)}>Nouvel événement</Button>
	</div>

	{#if data.events.length === 0}
		<Empty icon="🗓️" title="Aucun événement" sub="Planifiez ateliers, forums et sessions de coaching." />
	{:else}
		{#each data.events as e (e.id)}
			<Card padding="16px 20px" class="cs-events__row">
				<div class="cs-events__body">
					<p class="cs-events__name">
						{e.titre}
						<Badge
							label={e.online ? 'En ligne' : 'Présentiel'}
							color={e.online ? C.accentLight : C.purpleLight}
							textColor={e.online ? C.accent : C.purple}
						/>
					</p>
					<p class="cs-events__sub">
						{fmtDate(e.date)}{#if e.type} · {e.type}{/if}
					</p>
					{#if e.description}<p class="cs-events__desc">{e.description}</p>{/if}
				</div>
			</Card>
		{/each}
	{/if}
</div>

<Modal open={showForm} onclose={() => (showForm = false)} title="Nouvel événement" width={480}>
	<form
		method="POST"
		action="?/create"
		use:enhance={() => {
			creating = true;
			return async ({ result, update }) => {
				creating = false;
				await update();
				if (result.type === 'success') {
					showForm = false;
					pushToast('Événement créé ✓', 'success');
				} else if (result.type === 'failure') {
					pushToast((result.data?.error as string) ?? 'Erreur', 'error');
				}
			};
		}}
	>
		<Input label="Titre *" name="titre" placeholder="Ex: Atelier CV" required />
		<Input label="Type" name="type" placeholder="Ex: Atelier, Forum, Coaching" />
		<Input label="Date *" name="date" type="date" required />
		<label class="cs-events__lab" for="edesc">Description</label>
		<textarea id="edesc" name="description" class="cs-events__textarea" rows="3"></textarea>
		<label class="cs-events__check">
			<input type="checkbox" name="online" />
			<span>Événement en ligne</span>
		</label>
		<div class="cs-events__actions">
			<Button variant="subtle" type="button" onclick={() => (showForm = false)}>Annuler</Button>
			<Button type="submit" disabled={creating}>{creating ? 'Création…' : 'Créer'}</Button>
		</div>
	</form>
</Modal>

<style>
	.cs-events {
		max-width: 760px;
	}
	.cs-events__head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
		margin-bottom: 20px;
	}
	.cs-events__h {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 18px;
		color: var(--c-text);
	}
	:global(.cs-events__row) {
		margin-bottom: 10px;
	}
	.cs-events__name {
		font-weight: 600;
		font-size: 14px;
		color: var(--c-text);
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}
	.cs-events__sub {
		font-size: 12px;
		color: var(--c-muted);
		margin-top: 2px;
	}
	.cs-events__desc {
		font-size: 13px;
		color: var(--c-sub);
		margin-top: 8px;
		line-height: 1.5;
	}
	.cs-events__lab {
		display: block;
		font-size: 13px;
		font-weight: 600;
		color: var(--c-sub);
		margin: 12px 0 6px;
	}
	.cs-events__textarea {
		width: 100%;
		padding: 10px 12px;
		border-radius: 10px;
		border: 1.5px solid var(--c-border);
		font-size: 14px;
		font-family: var(--font-body);
		background: var(--c-card);
		outline: none;
	}
	.cs-events__check {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		color: var(--c-text);
		margin-top: 12px;
	}
	.cs-events__actions {
		display: flex;
		gap: 10px;
		justify-content: flex-end;
		margin-top: 18px;
	}
</style>
