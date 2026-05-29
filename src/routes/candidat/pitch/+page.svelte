<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import Button from '$lib/components/Button.svelte';
	import Empty from '$lib/components/Empty.svelte';
	import { enhance } from '$app/forms';
	import { pushToast } from '$lib/stores/toast.svelte';
	import type { LayoutData } from '../$types';

	let { data }: { data: LayoutData } = $props();

	function submit(pitch: boolean, msg: string, type: 'success' | 'info' = 'success') {
		return () =>
			async ({ update }: { update: () => Promise<void> }) => {
				await update();
				pushToast(msg, type);
			};
	}
</script>

<div class="cs-pitch">
	{#if data.candidat?.pitch}
		<Card padding="24px">
			<div class="cs-pitch__video">▶️</div>
			<div class="cs-pitch__actions">
				<form method="POST" action="?/set" use:enhance={submit(false, 'Vidéo supprimée', 'info')}>
					<input type="hidden" name="pitch" value="false" />
					<Button variant="ghost" type="submit">Supprimer</Button>
				</form>
				<Button>Remplacer</Button>
			</div>
		</Card>
	{:else}
		<Empty
			icon="🎥"
			title="Aucune vidéo pitch"
			sub="Une vidéo de 60–90 s multiplie vos chances d'entretien."
		>
			{#snippet action()}
				<form method="POST" action="?/set" use:enhance={submit(true, 'Vidéo uploadée !')}>
					<input type="hidden" name="pitch" value="true" />
					<Button type="submit">+ Ajouter ma vidéo</Button>
				</form>
			{/snippet}
		</Empty>
	{/if}
</div>

<style>
	.cs-pitch {
		max-width: 600px;
	}
	.cs-pitch__video {
		background: #000;
		border-radius: 10px;
		aspect-ratio: 16 / 9;
		display: grid;
		place-items: center;
		margin-bottom: 18px;
		font-size: 40px;
	}
	.cs-pitch__actions {
		display: flex;
		gap: 10px;
	}
</style>
