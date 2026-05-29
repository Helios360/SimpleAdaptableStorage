<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import Button from '$lib/components/Button.svelte';
	import Empty from '$lib/components/Empty.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Confirm from '$lib/components/Confirm.svelte';
	import Input from '$lib/components/Input.svelte';
	import FileUpload from '$lib/components/FileUpload.svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { pushToast } from '$lib/stores/toast.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let showAdd = $state(false);
	let newName = $state('');
	let uploading = $state(false);
	let delTarget = $state<{ id: number; name: string } | null>(null);
	let preview = $state<{ id: number; name: string } | null>(null);

	function fmtSize(b: number | null): string {
		if (!b) return '';
		if (b < 1024) return `${b} o`;
		if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} Ko`;
		return `${(b / (1024 * 1024)).toFixed(1)} Mo`;
	}

	function fmtDate(d: string | Date | null): string {
		if (!d) return '';
		const date = typeof d === 'string' ? new Date(d) : d;
		return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
	}
</script>

<div class="cs-page">
	<div class="cs-page__head">
		<h2 class="cs-page__title">📄 Mes CVs <span>({data.cvs.length})</span></h2>
		<Button icon="+" onclick={() => (showAdd = true)}>Ajouter un CV</Button>
	</div>

	{#if data.cvs.length === 0}
		<Empty icon="📄" title="Aucun CV déposé" sub="Téléverse ton premier CV pour le rendre visible aux recruteurs.">
			{#snippet action()}
				<Button onclick={() => (showAdd = true)}>+ Ajouter</Button>
			{/snippet}
		</Empty>
	{:else}
		{#each data.cvs as cv (cv.id)}
			<Card padding="16px 20px" class="cs-cv">
				<span class="cs-cv__icon">📄</span>
				<div class="cs-cv__body">
					<p class="cs-cv__name">{cv.name}</p>
					<p class="cs-cv__sub">
						{fmtDate(cv.createdAt)}{#if cv.size} · {fmtSize(cv.size)}{/if}
					</p>
				</div>
				<Button size="sm" variant="ghost" disabled={!cv.path} onclick={() => (preview = { id: cv.id, name: cv.name })}>
					Aperçu
				</Button>
				<a class="cs-cv__dl" class:cs-cv__dl--off={!cv.path} href={cv.path ? `/files/cv/${cv.id}?dl=1` : '#'}>
					Télécharger
				</a>
				<Button size="sm" variant="danger" onclick={() => (delTarget = { id: cv.id, name: cv.name })}>
					Supprimer
				</Button>
			</Card>
		{/each}
	{/if}
</div>

<Modal open={showAdd} onclose={() => (showAdd = false)} title="Nouveau CV" width={420}>
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
					newName = '';
					pushToast('CV ajouté ✓');
				} else if (result.type === 'failure') {
					const err = result.data?.error;
					pushToast(typeof err === 'string' ? err : 'Erreur lors de l\'envoi', 'error');
				}
			};
		}}
	>
		<Input label="Nom du CV" name="name" bind:value={newName} placeholder="Ex: CV Alternance 2026" autofocus required />
		<div class="cs-cv__upload">
			<FileUpload
				label="Fichier PDF"
				name="file"
				accept=".pdf"
				hint="PDF uniquement, 5 Mo max"
				maxSizeMB={5}
				required
			/>
		</div>
		<div class="cs-cv__modal-actions">
			<Button variant="subtle" type="button" onclick={() => (showAdd = false)}>Annuler</Button>
			<Button type="submit" disabled={uploading || !newName.trim()}>
				{uploading ? 'Envoi…' : 'Ajouter'}
			</Button>
		</div>
	</form>
</Modal>

<Modal open={!!preview} onclose={() => (preview = null)} title={preview?.name ?? 'Aperçu'} width={900}>
	{#if preview}
		<iframe class="cs-cv__pdf" src={`/files/cv/${preview.id}`} title={preview.name}></iframe>
		<div class="cs-cv__modal-actions">
			<a class="cs-cv__dl" href={`/files/cv/${preview.id}?dl=1`}>Télécharger</a>
			<Button variant="subtle" type="button" onclick={() => (preview = null)}>Fermer</Button>
		</div>
	{/if}
</Modal>

<Confirm
	open={!!delTarget}
	onclose={() => (delTarget = null)}
	danger
	title="Supprimer ce CV ?"
	message="Cette action est irréversible."
	onconfirm={async () => {
		if (!delTarget) return;
		const fd = new FormData();
		fd.set('id', String(delTarget.id));
		await fetch('?/remove', { method: 'POST', body: fd });
		await invalidateAll();
		pushToast('CV supprimé', 'info');
		delTarget = null;
	}}
/>

<style>
	.cs-page {
		max-width: 700px;
	}
	.cs-page__head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 20px;
	}
	.cs-page__title {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 18px;
		color: var(--c-text);
	}
	.cs-page__title span {
		color: var(--c-muted);
		font-weight: 600;
	}
	:global(.cs-cv) {
		display: flex;
		align-items: center;
		gap: 14px;
		margin-bottom: 10px;
		flex-wrap: wrap;
	}
	.cs-cv__icon {
		font-size: 28px;
	}
	.cs-cv__body {
		flex: 1 1 180px;
		min-width: 0;
	}
	.cs-cv__name {
		font-weight: 600;
		font-size: 14px;
		color: var(--c-text);
	}
	.cs-cv__sub {
		font-size: 12px;
		color: var(--c-muted);
	}
	.cs-cv__dl {
		font-size: 13px;
		font-weight: 600;
		color: var(--c-blue);
		padding: 7px 12px;
		border-radius: 7px;
		box-shadow: inset 0 0 0 1.5px var(--c-blue);
	}
	.cs-cv__dl:hover {
		background: var(--c-blue-soft);
	}
	.cs-cv__dl--off {
		opacity: 0.4;
		pointer-events: none;
	}
	.cs-cv__upload {
		margin-top: 14px;
	}
	.cs-cv__modal-actions {
		display: flex;
		gap: 10px;
		margin-top: 18px;
		justify-content: flex-end;
		align-items: center;
		flex-wrap: wrap;
	}
	.cs-cv__pdf {
		width: 100%;
		height: 70vh;
		border: 1px solid var(--c-border);
		border-radius: 10px;
		background: var(--c-bg);
	}
</style>
