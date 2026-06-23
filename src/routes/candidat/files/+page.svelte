<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import Button from '$lib/components/Button.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Empty from '$lib/components/Empty.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Confirm from '$lib/components/Confirm.svelte';
	import Input from '$lib/components/Input.svelte';
	import Loader from '$lib/components/Loader.svelte';
	import FileUpload from '$lib/components/FileUpload.svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { pushToast } from '$lib/stores/toast.svelte';
	import { C } from '$lib/tokens';
	import type { PageData } from './$types';

	type DocSlot = 'cv' | 'id_recto' | 'id_verso';
	interface Suggestion {
		title: string;
		detail: string;
		impact: 'fort' | 'moyen';
	}

	let { data }: { data: PageData } = $props();

	const candidatId = $derived(data.candidatId);

	// ── CV library ──────────────────────────────────────────────────────────
	let showAddCv = $state(false);
	let newCvName = $state('');
	let newCvTag = $state('');
	let cvUploading = $state(false);
	let cvDelTarget = $state<{ id: number; name: string } | null>(null);

	// ── Suggestions IA ────────────────────────────────────────────────────────
	let showSuggest = $state(false);
	let suggestCv = $state<{ id: number; name: string } | null>(null);
	let suggestPoste = $state('');
	let suggestLoading = $state(false);
	let suggestions = $state<Suggestion[]>([]);
	let suggestFallback = $state(false);

	async function activateCv(id: number) {
		const fd = new FormData();
		fd.set('id', String(id));
		await fetch('?/cvActivate', { method: 'POST', body: fd });
		await invalidateAll();
		pushToast('CV actif ✓', 'success');
	}

	function openSuggest(c: { id: number; name: string }) {
		suggestCv = { id: c.id, name: c.name };
		suggestPoste = '';
		suggestions = [];
		suggestFallback = false;
		showSuggest = true;
	}

	async function runSuggest() {
		if (!suggestCv) return;
		suggestLoading = true;
		try {
			const res = await fetch('/api/ai/cv-suggestions', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ cvId: suggestCv.id, poste: suggestPoste })
			});
			if (!res.ok) throw new Error('ai failed');
			const out = (await res.json()) as { suggestions: Suggestion[]; fallback: boolean };
			suggestions = out.suggestions;
			suggestFallback = out.fallback;
		} catch {
			pushToast('Suggestions IA indisponibles', 'error');
		} finally {
			suggestLoading = false;
		}
	}

	const VIDEO_TIPS = [
		'Présentez-vous en 60–90 secondes : prénom, formation, projet pro.',
		'Filmez à hauteur des yeux, dans un endroit calme et bien éclairé.',
		'Regardez l’objectif, souriez et parlez clairement, sans lire un texte.',
		'Mettez en avant 1 ou 2 réussites concrètes plutôt qu’une liste exhaustive.',
		'Terminez par votre objectif (alternance, stage, CDI) et votre disponibilité.'
	];

	// ── Inscription document slots ────────────────────────────────────────────
	let docInputs: Partial<Record<DocSlot, HTMLInputElement>> = $state({});
	let docBusy = $state<Record<DocSlot, boolean>>({ cv: false, id_recto: false, id_verso: false });
	let docDelTarget = $state<{ slot: DocSlot; label: string } | null>(null);

	// ── Pitch video ─────────────────────────────────────────────────────────
	let showVideoUpload = $state(false);
	let videoUploading = $state(false);
	let videoDelConfirm = $state(false);
	const hasVideo = $derived(!!data.pitchPath);
	const videoUrl = $derived(`/files/candidat/${candidatId}/pitch?v=${data.pitchPath ?? ''}`);

	function fileUrl(slot: DocSlot, download = false): string {
		return `/files/candidat/${candidatId}/${slot}${download ? '?dl=1' : ''}`;
	}

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

	async function uploadDoc(slot: DocSlot, label: string) {
		const inp = docInputs[slot];
		const file = inp?.files?.[0];
		if (!file) {
			pushToast('Sélectionnez un fichier.', 'error');
			return;
		}
		docBusy[slot] = true;
		const fd = new FormData();
		fd.set('candidatId', String(candidatId));
		fd.set('slot', slot);
		fd.set('file', file);
		try {
			const res = await fetch('?/docUpload', { method: 'POST', body: fd });
			if (!res.ok) throw new Error('upload failed');
			if (inp) inp.value = '';
			await invalidateAll();
			pushToast(`${label} mis à jour ✓`);
		} catch {
			pushToast("Erreur lors de l'envoi", 'error');
		} finally {
			docBusy[slot] = false;
		}
	}

	async function removeDoc(slot: DocSlot, label: string) {
		docBusy[slot] = true;
		const fd = new FormData();
		fd.set('candidatId', String(candidatId));
		fd.set('slot', slot);
		try {
			const res = await fetch('?/docRemove', { method: 'POST', body: fd });
			if (!res.ok) throw new Error('remove failed');
			await invalidateAll();
			pushToast(`${label} supprimé`, 'info');
		} catch {
			pushToast('Erreur', 'error');
		} finally {
			docBusy[slot] = false;
			docDelTarget = null;
		}
	}
</script>

{#snippet docSlot(slot: DocSlot, icon: string, label: string, accept: string, hint: string)}
	{@const present = !!data.docs[slot]}
	{@const busy = docBusy[slot]}
	<div class="cs-files__doc">
		<span class="cs-files__doc-icon">{icon}</span>
		<div class="cs-files__doc-body">
			<p class="cs-files__doc-name">{label}</p>
			<p class="cs-files__doc-status" class:cs-files__doc-status--ok={present}>
				{present ? 'Déposé ✓' : 'Non déposé'}
			</p>
		</div>
		{#if present}
			<a class="cs-files__link" href={fileUrl(slot)} target="_blank" rel="noreferrer">Aperçu</a>
			<a class="cs-files__link" href={fileUrl(slot, true)}>Télécharger</a>
		{/if}
		<input
			class="cs-files__file"
			type="file"
			{accept}
			bind:this={docInputs[slot]}
			disabled={busy}
			aria-label={hint}
		/>
		<Button size="sm" onclick={() => uploadDoc(slot, label)} disabled={busy}>
			{busy ? '…' : present ? 'Remplacer' : 'Déposer'}
		</Button>
		{#if present}
			<Button size="sm" variant="danger" onclick={() => (docDelTarget = { slot, label })} disabled={busy}>
				Supprimer
			</Button>
		{/if}
	</div>
{/snippet}

<div class="cs-files">
	<!-- ══ CVs ══ -->
	<section class="cs-files__section">
		<div class="cs-files__head">
			<h2 class="cs-files__title">📄 CVs <span>({data.cvs.length})</span></h2>
			<Button icon="+" onclick={() => (showAddCv = true)}>Ajouter un CV</Button>
		</div>

		<Card padding="16px 20px">
			{@render docSlot('cv', '📌', "CV d'inscription", '.pdf', 'PDF, 5 Mo max')}
			<p class="cs-files__note">
				CV transmis lors de votre inscription — c'est celui que votre école vérifie.
			</p>
		</Card>

		<p class="cs-files__sub-lab">Ma bibliothèque de CVs</p>
		{#if data.cvs.length === 0}
			<Empty icon="📄" title="Aucun CV déposé" sub="Téléverse un CV pour le rendre visible aux recruteurs.">
				{#snippet action()}
					<Button onclick={() => (showAddCv = true)}>+ Ajouter</Button>
				{/snippet}
			</Empty>
		{:else}
			{#each data.cvs as c (c.id)}
				<Card padding="16px 20px" class="cs-files__cv" style={c.active ? `border:2px solid ${C.blue}` : ''}>
					<span class="cs-files__doc-icon">📄</span>
					<div class="cs-files__doc-body">
						<p class="cs-files__doc-name">
							{c.name}
							{#if c.tag}<Badge label={c.tag} color={C.blueLight} textColor={C.blue} />{/if}
							{#if c.active}<Badge label="✓ Actif" color={C.greenLight} textColor={C.green} />{/if}
						</p>
						<p class="cs-files__doc-status">
							{fmtDate(c.createdAt)}{#if c.size} · {fmtSize(c.size)}{/if}
						</p>
					</div>
					{#if !c.active}
						<Button size="sm" variant="ghost" onclick={() => activateCv(c.id)}>Activer</Button>
					{/if}
					<Button size="sm" variant="subtle" onclick={() => openSuggest(c)}>💡 Conseils IA</Button>
					<a class="cs-files__link" class:cs-files__link--off={!c.path} href={c.path ? `/files/cv/${c.id}` : '#'} target="_blank" rel="noreferrer">
						Aperçu
					</a>
					<a class="cs-files__link" class:cs-files__link--off={!c.path} href={c.path ? `/files/cv/${c.id}?dl=1` : '#'}>
						Télécharger
					</a>
					<Button size="sm" variant="danger" onclick={() => (cvDelTarget = { id: c.id, name: c.name })}>
						Supprimer
					</Button>
				</Card>
			{/each}
		{/if}
	</section>

	<!-- ══ Pièces d'identité ══ -->
	<section class="cs-files__section">
		<h2 class="cs-files__title">🪪 Pièces d'identité</h2>
		<Card padding="16px 20px">
			{@render docSlot('id_recto', '🪪', "Pièce d'identité (recto)", '.pdf,.png,.jpg,.jpeg,.webp', 'PDF ou image, 5 Mo max')}
			<div class="cs-files__divider"></div>
			{@render docSlot('id_verso', '🪪', "Pièce d'identité (verso)", '.pdf,.png,.jpg,.jpeg,.webp', 'PDF ou image, 5 Mo max')}
		</Card>
	</section>

	<!-- ══ Vidéo pitch ══ -->
	<section class="cs-files__section">
		<h2 class="cs-files__title">🎥 Vidéo pitch</h2>
		{#if hasVideo}
			<Card padding="20px">
				<!-- svelte-ignore a11y_media_has_caption -->
				<video class="cs-files__video" src={videoUrl} controls preload="metadata"></video>
				<p class="cs-files__video-badge">
					<Badge label="👁 Visible par les CRE et recruteurs" color={C.greenLight} textColor={C.green} />
				</p>
				<div class="cs-files__video-actions">
					<Button onclick={() => (showVideoUpload = true)}>Remplacer</Button>
					<Button variant="ghost" onclick={() => (videoDelConfirm = true)}>Supprimer</Button>
				</div>
			</Card>
		{:else}
			<Empty icon="🎥" title="Aucune vidéo pitch" sub="Une vidéo de 60–90 s multiplie vos chances d'entretien.">
				{#snippet action()}
					<Button onclick={() => (showVideoUpload = true)}>+ Ajouter ma vidéo</Button>
				{/snippet}
			</Empty>
		{/if}

		<Card padding="16px 20px">
			<p class="cs-files__tips-title">🎬 5 conseils pour réussir votre pitch</p>
			<ol class="cs-files__tips">
				{#each VIDEO_TIPS as tip}
					<li>{tip}</li>
				{/each}
			</ol>
		</Card>
	</section>
</div>

<!-- ── CV library add modal ── -->
<Modal open={showAddCv} onclose={() => (showAddCv = false)} title="Nouveau CV" width={420}>
	<form
		method="POST"
		action="?/cvAdd"
		enctype="multipart/form-data"
		use:enhance={() => {
			cvUploading = true;
			return async ({ result, update }) => {
				cvUploading = false;
				await update();
				if (result.type === 'success') {
					showAddCv = false;
					newCvName = '';
					newCvTag = '';
					pushToast('CV ajouté ✓');
				} else if (result.type === 'failure') {
					const err = result.data?.error;
					pushToast(typeof err === 'string' ? err : "Erreur lors de l'envoi", 'error');
				}
			};
		}}
	>
		<Input label="Nom du CV" name="name" bind:value={newCvName} placeholder="Ex: CV Alternance 2026" autofocus required />
		<label class="cs-files__tag-lab" for="cv-tag">Type de CV</label>
		<select id="cv-tag" name="tag" class="cs-files__tag-select" bind:value={newCvTag}>
			<option value="">— Aucun —</option>
			{#each data.cvTags as t}
				<option value={t}>{t}</option>
			{/each}
		</select>
		<div class="cs-files__modal-upload">
			<FileUpload label="Fichier PDF" name="file" accept=".pdf" hint="PDF uniquement, 5 Mo max" maxSizeMB={5} required />
		</div>
		<div class="cs-files__modal-actions">
			<Button variant="subtle" type="button" onclick={() => (showAddCv = false)}>Annuler</Button>
			<Button type="submit" disabled={cvUploading || !newCvName.trim()}>
				{cvUploading ? 'Envoi…' : 'Ajouter'}
			</Button>
		</div>
	</form>
</Modal>

<!-- ── Video upload modal ── -->
<Modal
	open={showVideoUpload}
	onclose={() => (showVideoUpload = false)}
	title={hasVideo ? 'Remplacer la vidéo' : 'Ajouter ma vidéo'}
	width={460}
>
	<form
		method="POST"
		action="?/pitchUpload"
		enctype="multipart/form-data"
		use:enhance={() => {
			videoUploading = true;
			return async ({ result, update }) => {
				videoUploading = false;
				await update();
				if (result.type === 'success') {
					showVideoUpload = false;
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
			accept=".mp4,.webm,.mov,.ogg,.ogv"
			hint="MP4 ou WebM recommandé, 50 Mo max"
			maxSizeMB={50}
			required
		/>
		<div class="cs-files__modal-actions">
			<Button variant="subtle" type="button" onclick={() => (showVideoUpload = false)}>Annuler</Button>
			<Button type="submit" disabled={videoUploading}>{videoUploading ? 'Envoi…' : 'Envoyer'}</Button>
		</div>
	</form>
</Modal>

<!-- ── CV AI suggestions modal ── -->
<Modal
	open={showSuggest}
	onclose={() => (showSuggest = false)}
	title={suggestCv ? `Conseils IA — ${suggestCv.name}` : 'Conseils IA'}
	width={520}
>
	<p class="cs-files__suggest-lead">
		Analyse IA de votre CV selon le poste visé. Indiquez le poste cible pour des conseils ciblés.
	</p>
	<div class="cs-files__suggest-form">
		<Input label="Poste cible" name="poste" bind:value={suggestPoste} placeholder="Ex: Développeur React" />
		<Button onclick={runSuggest} disabled={suggestLoading}>
			{suggestLoading ? 'Analyse…' : 'Analyser'}
		</Button>
	</div>

	{#if suggestLoading}
		<Loader block label="L'IA analyse votre CV…" />
	{:else if suggestions.length}
		{#if suggestFallback}
			<p class="cs-files__suggest-fallback">⚠ Conseils génériques (IA momentanément indisponible).</p>
		{/if}
		<ul class="cs-files__suggest-list">
			{#each suggestions as s}
				<li class="cs-files__suggest-item">
					<div class="cs-files__suggest-head">
						<span class="cs-files__suggest-title">{s.title}</span>
						<Badge
							label={s.impact === 'fort' ? 'Impact fort' : 'Impact moyen'}
							color={s.impact === 'fort' ? C.greenLight : C.orangeLight}
							textColor={s.impact === 'fort' ? C.green : C.orange}
						/>
					</div>
					<p class="cs-files__suggest-detail">{s.detail}</p>
				</li>
			{/each}
		</ul>
	{/if}
</Modal>

<!-- ── Confirms ── -->
<Confirm
	open={!!cvDelTarget}
	onclose={() => (cvDelTarget = null)}
	danger
	title="Supprimer ce CV ?"
	message="Cette action est irréversible."
	onconfirm={async () => {
		if (!cvDelTarget) return;
		const fd = new FormData();
		fd.set('id', String(cvDelTarget.id));
		await fetch('?/cvRemove', { method: 'POST', body: fd });
		await invalidateAll();
		pushToast('CV supprimé', 'info');
		cvDelTarget = null;
	}}
/>

<Confirm
	open={!!docDelTarget}
	onclose={() => (docDelTarget = null)}
	danger
	title="Supprimer ce document ?"
	message="Cette action est irréversible."
	onconfirm={() => docDelTarget && removeDoc(docDelTarget.slot, docDelTarget.label)}
/>

<Confirm
	open={videoDelConfirm}
	onclose={() => (videoDelConfirm = false)}
	danger
	title="Supprimer la vidéo ?"
	message="Cette action est irréversible."
	onconfirm={async () => {
		await fetch('?/pitchRemove', { method: 'POST', body: new FormData() });
		await invalidateAll();
		pushToast('Vidéo supprimée', 'info');
		videoDelConfirm = false;
	}}
/>

<style>
	.cs-files {
		max-width: 760px;
		display: flex;
		flex-direction: column;
		gap: 34px;
	}
	.cs-files__head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 14px;
	}
	.cs-files__title {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 18px;
		color: var(--c-text);
		margin-bottom: 14px;
	}
	.cs-files__head .cs-files__title {
		margin-bottom: 0;
	}
	.cs-files__title span {
		color: var(--c-muted);
		font-weight: 600;
	}
	.cs-files__sub-lab {
		font-size: 13px;
		font-weight: 700;
		color: var(--c-sub);
		margin: 16px 0 10px;
	}
	.cs-files__note {
		font-size: 12px;
		color: var(--c-muted);
		margin-top: 10px;
	}
	:global(.cs-files__cv) {
		margin-bottom: 10px;
	}
	.cs-files__doc,
	:global(.cs-files__cv) {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}
	.cs-files__doc-icon {
		font-size: 26px;
		flex-shrink: 0;
	}
	.cs-files__doc-body {
		flex: 1 1 160px;
		min-width: 0;
	}
	.cs-files__doc-name {
		font-weight: 600;
		font-size: 14px;
		color: var(--c-text);
	}
	.cs-files__doc-status {
		font-size: 12px;
		color: var(--c-muted);
	}
	.cs-files__doc-status--ok {
		color: var(--c-green);
		font-weight: 600;
	}
	.cs-files__file {
		font-size: 12px;
		max-width: 190px;
	}
	.cs-files__link {
		font-size: 13px;
		font-weight: 600;
		color: var(--c-blue);
		padding: 7px 12px;
		border-radius: 7px;
		box-shadow: inset 0 0 0 1.5px var(--c-blue);
	}
	.cs-files__link:hover {
		background: var(--c-blue-soft);
	}
	.cs-files__link--off {
		opacity: 0.4;
		pointer-events: none;
	}
	.cs-files__divider {
		width: 100%;
		height: 1px;
		background: var(--c-border);
		margin: 14px 0;
	}
	.cs-files__video {
		display: block;
		width: 100%;
		background: #000;
		border-radius: 10px;
		aspect-ratio: 16 / 9;
		margin-bottom: 16px;
	}
	.cs-files__video-actions {
		display: flex;
		gap: 10px;
	}
	.cs-files__modal-upload {
		margin-top: 14px;
	}
	.cs-files__tag-lab {
		display: block;
		font-size: 13px;
		font-weight: 600;
		color: var(--c-sub);
		margin: 14px 0 6px;
	}
	.cs-files__tag-select {
		width: 100%;
		padding: 10px 12px;
		border-radius: 10px;
		border: 1.5px solid var(--c-border);
		font-size: 14px;
		background: var(--c-card);
		outline: none;
	}
	.cs-files__video-badge {
		margin-bottom: 12px;
	}
	.cs-files__tips-title {
		font-weight: 700;
		font-size: 14px;
		color: var(--c-text);
		margin-bottom: 10px;
	}
	.cs-files__tips {
		margin: 0;
		padding-left: 20px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.cs-files__tips li {
		font-size: 13px;
		color: var(--c-sub);
		line-height: 1.5;
	}
	.cs-files__suggest-lead {
		font-size: 13px;
		color: var(--c-sub);
		margin-bottom: 14px;
	}
	.cs-files__suggest-form {
		display: flex;
		align-items: flex-end;
		gap: 10px;
		margin-bottom: 18px;
	}
	.cs-files__suggest-form :global(.cs-input) {
		flex: 1;
	}
	.cs-files__suggest-fallback {
		font-size: 12px;
		color: var(--c-orange-text, var(--c-orange));
		margin-bottom: 10px;
	}
	.cs-files__suggest-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.cs-files__suggest-item {
		border: 1px solid var(--c-border);
		border-radius: 10px;
		padding: 12px 14px;
	}
	.cs-files__suggest-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 10px;
		margin-bottom: 4px;
	}
	.cs-files__suggest-title {
		font-weight: 600;
		font-size: 14px;
		color: var(--c-text);
	}
	.cs-files__suggest-detail {
		font-size: 13px;
		color: var(--c-sub);
		line-height: 1.5;
	}
	.cs-files__modal-actions {
		display: flex;
		gap: 10px;
		margin-top: 18px;
		justify-content: flex-end;
	}
</style>
