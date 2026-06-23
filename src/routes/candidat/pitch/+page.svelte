<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import Button from '$lib/components/Button.svelte';
	import Empty from '$lib/components/Empty.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Confirm from '$lib/components/Confirm.svelte';
	import FileUpload from '$lib/components/FileUpload.svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { pushToast } from '$lib/stores/toast.svelte';
	import type { LayoutData } from '../$types';

	let { data }: { data: LayoutData } = $props();

	let showAdd = $state(false);
	let uploading = $state(false);
	let confirmDel = $state(false);

	let videoSrc = $derived.by(() => {
		if (!data.candidat?.pitch || !data.candidat.id) return null;
		const key = encodeURIComponent(data.candidat.pitchPath ?? '');
		return `/files/candidat/${data.candidat.id}/pitch?v=${key}`;
	});
</script>

<div class="cs-pitch">
	{#if data.candidat?.pitch && videoSrc}
		<Card padding="24px">
			<!-- svelte-ignore a11y_media_has_caption -->
			<video class="cs-pitch__video" controls preload="metadata" src={videoSrc}></video>
			<div class="cs-pitch__actions">
				<Button variant="ghost" onclick={() => (confirmDel = true)}>Supprimer</Button>
				<Button onclick={() => (showAdd = true)}>Remplacer</Button>
			</div>
		</Card>
	{:else}
		<Empty
			icon="🎥"
			title="Aucune vidéo pitch"
			sub="Une vidéo de 60–90 s multiplie vos chances d'entretien."
		>
			{#snippet action()}
				<Button onclick={() => (showAdd = true)}>+ Ajouter ma vidéo</Button>
			{/snippet}
		</Empty>
	{/if}
</div>

<Modal open={showAdd} onclose={() => (showAdd = false)} title="Vidéo pitch" width={460}>
	<form
		method="POST"
		action="?/add"
		enctype="multipart/form-data"
		use:enhance={() => {
			uploading = true;
			return async ({ result, update }) => {
				uploading = false;
				await update();
				if (result.type === 'success') {
					showAdd = false;
					pushToast('Vidéo uploadée ✓');
				} else if (result.type === 'failure') {
					const err = result.data?.error;
					pushToast(typeof err === 'string' ? err : "Erreur lors de l'envoi", 'error');
				}
			};
		}}
	>
		<FileUpload
			label="Fichier vidéo"
			name="file"
			accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v"
			hint="MP4, WebM ou MOV — 100 Mo max"
			maxSizeMB={100}
			required
		/>
		<div class="cs-pitch__modal-actions">
			<Button variant="subtle" type="button" onclick={() => (showAdd = false)}>Annuler</Button>
			<Button type="submit" disabled={uploading}>
				{uploading ? 'Envoi…' : 'Envoyer'}
			</Button>
		</div>
	</form>
</Modal>

<Confirm
	open={confirmDel}
	onclose={() => (confirmDel = false)}
	danger
	title="Supprimer la vidéo ?"
	message="Cette action est irréversible."
	onconfirm={async () => {
		const fd = new FormData();
		const res = await fetch('?/remove', { method: 'POST', body: fd });
		confirmDel = false;
		if (res.ok) {
			await invalidateAll();
			pushToast('Vidéo supprimée', 'info');
		} else {
			pushToast('Erreur lors de la suppression', 'error');
		}
	}}
/>

<style>
	.cs-pitch {
		max-width: 600px;
	}
	.cs-pitch__video {
		width: 100%;
		background: #000;
		border-radius: 10px;
		aspect-ratio: 16 / 9;
		display: block;
		margin-bottom: 18px;
	}
	.cs-pitch__actions {
		display: flex;
		gap: 10px;
	}
	.cs-pitch__modal-actions {
		display: flex;
		gap: 10px;
		margin-top: 18px;
		justify-content: flex-end;
		align-items: center;
		flex-wrap: wrap;
	}
</style>
