<script lang="ts" module>
	export interface CvRefView {
		id: number;
		name: string;
		size: number | null;
		mime: string | null;
		hasFile: boolean;
	}

	export interface CandidatView {
		id: number;
		userId?: string;
		name: string;
		lname?: string;
		fname?: string;
		formation: string;
		formationId?: number | null;
		city?: string;
		ville?: string;
		formationCode?: string | null;
		year?: number | null;
		age?: number | null;
		tel?: string | null;
		email?: string;
		postal?: string | null;
		birth?: string | null;
		tags?: string[];
		skills?: string[];
		permis?: boolean;
		vehicule?: boolean;
		mobile?: boolean;
		score: number | null;
		pitch: boolean;
		statut: string;
		rechercheStatut?: string;
		cvs: CvRefView[];
		hasCvDoc?: boolean;
		hasIdRecto?: boolean;
		hasIdVerso?: boolean;
		idRectoKind?: 'pdf' | 'image';
		idVersoKind?: 'pdf' | 'image';
		titreValide?: string | null;
	}

	export interface Formation {
		id: number;
		code: string;
		name: string;
	}
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import Modal from './Modal.svelte';
	import Badge from './Badge.svelte';
	import Button from './Button.svelte';
	import Confirm from './Confirm.svelte';
	import FileUpload from './FileUpload.svelte';
	import { initials, scoreColor, rechercheStatutLabel } from '$lib/utils';
	import { pushToast } from '$lib/stores/toast.svelte';
	import { C } from '$lib/tokens';

	interface Props {
		candidat: CandidatView | null;
		open: boolean;
		onclose: () => void;
		editable?: boolean;
		formations?: Formation[];
		tagSuggestions?: string[];
		skillSuggestions?: string[];
		footer?: Snippet;
		onsaved?: () => void;
		/** Render content directly without the Modal wrapper (e.g. as a page). */
		inline?: boolean;
		/** Hide the tags section + omit tags from the save payload (student mode). */
		hideTags?: boolean;
		/** Student-facing mode: hide fields the student shouldn't see/edit
		 *  (adresse, statut recherche, fin de validité du titre de séjour). */
		studentMode?: boolean;
		/** Hide CV upload form + per-CV delete buttons (read-only CV list). */
		manageCvs?: boolean;
		/** Allow upload/remove of the 3 inscription slots (cv/id_recto/id_verso). */
		manageInscription?: boolean;
		/** Hide the Documents + CVs sections entirely (e.g. when files live elsewhere). */
		hideFiles?: boolean;
		/** Form action to POST the save payload to. */
		actionName?: string;
		/** When set, render a danger button in the footer; runs on confirm. */
		ondelete?: () => void | Promise<void>;
		/** Custom label for the danger button. */
		deleteLabel?: string;
		/** Custom confirm dialog title. */
		deleteConfirmTitle?: string;
		/** Custom confirm dialog message. */
		deleteConfirmMessage?: string;
		/** When set, render a "send reset link" button next to delete; runs on click. */
		onresetpassword?: () => void | Promise<void>;
		/** Custom label for the reset-password button. */
		resetLabel?: string;
	}

	let {
		candidat,
		open,
		onclose,
		editable = false,
		formations = [],
		tagSuggestions = [],
		skillSuggestions = [],
		footer,
		onsaved,
		inline = false,
		hideTags = false,
		studentMode = false,
		manageCvs = true,
		manageInscription = true,
		hideFiles = false,
		actionName = '?/updateCandidat',
		ondelete,
		deleteLabel = 'Supprimer',
		deleteConfirmTitle = 'Suppression définitive',
		deleteConfirmMessage = 'Cette action est irréversible. Le compte, le profil et tous les fichiers associés seront effacés.',
		onresetpassword,
		resetLabel = 'Envoyer un lien de reset'
	}: Props = $props();

	let deleteConfirmOpen = $state(false);
	let deleting = $state(false);

	async function runDelete() {
		if (!ondelete || deleting) return;
		deleting = true;
		try {
			await ondelete();
		} finally {
			deleting = false;
		}
	}

	let resetting = $state(false);
	async function runReset() {
		if (!onresetpassword || resetting) return;
		resetting = true;
		try {
			await onresetpassword();
		} finally {
			resetting = false;
		}
	}

	let edit = $state<CandidatView | null>(null);
	let saving = $state(false);
	let tagInput = $state('');
	let skillInput = $state('');
	let preview = $state<{ url: string; title: string; kind: 'pdf' | 'image' | 'video' } | null>(null);

	// New CV state for admin upload
	let newCvName = $state('');
	let newCvFile: HTMLInputElement | undefined = $state();

	$effect(() => {
		if (candidat && (open || inline)) {
			edit = structuredClone($state.snapshot(candidat)) as CandidatView;
			tagInput = '';
			skillInput = '';
			newCvName = '';
		}
	});

	function inferKind(name: string): 'pdf' | 'image' | 'video' {
		if (/\.(png|jpe?g|webp|gif)$/i.test(name)) return 'image';
		if (/\.(mp4|webm|mov|ogg|ogv)$/i.test(name)) return 'video';
		return 'pdf';
	}

	function openPreview(url: string, title: string, kind?: 'pdf' | 'image' | 'video') {
		preview = { url, title, kind: kind ?? inferKind(url) };
	}

	function addTag() {
		if (!edit) return;
		const v = tagInput.trim();
		if (v && !(edit.tags ?? []).includes(v)) edit.tags = [...(edit.tags ?? []), v];
		tagInput = '';
	}
	function removeTag(t: string) {
		if (!edit) return;
		edit.tags = (edit.tags ?? []).filter((x) => x !== t);
	}
	function addSkill() {
		if (!edit) return;
		const v = skillInput.trim();
		if (v && !(edit.skills ?? []).includes(v)) edit.skills = [...(edit.skills ?? []), v];
		skillInput = '';
	}
	function removeSkill(s: string) {
		if (!edit) return;
		edit.skills = (edit.skills ?? []).filter((x) => x !== s);
	}

	async function save() {
		if (!edit || !candidat) return;
		saving = true;
		const fd = new FormData();
		fd.set('id', String(edit.id));
		fd.set('lname', edit.lname ?? '');
		fd.set('fname', edit.fname ?? '');
		fd.set('tel', edit.tel ?? '');
		fd.set('city', edit.city ?? '');
		fd.set('postal', edit.postal ?? '');
		fd.set('birth', edit.birth ?? '');
		fd.set('formationId', edit.formationId != null ? String(edit.formationId) : '');
		fd.set('year', edit.year != null ? String(edit.year) : '');
		fd.set('permis', edit.permis ? '1' : '');
		fd.set('vehicule', edit.vehicule ? '1' : '');
		fd.set('mobile', edit.mobile ? '1' : '');
		fd.set('rechercheStatut', edit.rechercheStatut ?? '');
		if (!hideTags) fd.set('tags', JSON.stringify(edit.tags ?? []));
		fd.set('skills', JSON.stringify(edit.skills ?? []));
		fd.set('titreValide', edit.titreValide ?? '');

		try {
			const res = await fetch(actionName, { method: 'POST', body: fd });
			if (!res.ok) throw new Error('save failed');
			pushToast('Modifications enregistrées ✓');
			onsaved?.();
		} catch {
			pushToast('Erreur lors de la sauvegarde', 'error');
		} finally {
			saving = false;
		}
	}

	async function uploadCv() {
		if (!edit) return;
		const file = newCvFile?.files?.[0];
		if (!file || !newCvName.trim()) {
			pushToast('Nom et fichier requis', 'error');
			return;
		}
		const fd = new FormData();
		fd.set('candidatId', String(edit.id));
		fd.set('name', newCvName.trim());
		fd.set('file', file);
		const res = await fetch('?/adminAddCv', { method: 'POST', body: fd });
		if (res.ok) {
			pushToast('CV ajouté ✓');
			newCvName = '';
			if (newCvFile) newCvFile.value = '';
			onsaved?.();
		} else {
			pushToast('Erreur lors de l\'envoi', 'error');
		}
	}

	async function deleteCv(cvId: number) {
		if (!edit) return;
		if (!confirm('Supprimer ce CV ?')) return;
		const fd = new FormData();
		fd.set('candidatId', String(edit.id));
		fd.set('cvId', String(cvId));
		const res = await fetch('?/adminRemoveCv', { method: 'POST', body: fd });
		if (res.ok) {
			pushToast('CV supprimé', 'info');
			edit.cvs = edit.cvs.filter((c) => c.id !== cvId);
			onsaved?.();
		} else {
			pushToast('Erreur', 'error');
		}
	}

	type InscriptionSlotKey = 'cv' | 'id_recto' | 'id_verso';
	const INSCRIPTION_LABELS: Record<InscriptionSlotKey, string> = {
		cv: "CV d'inscription",
		id_recto: "Pièce d'identité (recto)",
		id_verso: "Pièce d'identité (verso)"
	};
	const INSCRIPTION_ICONS: Record<InscriptionSlotKey, string> = {
		cv: '📄',
		id_recto: '🪪',
		id_verso: '🪪'
	};
	const INSCRIPTION_ACCEPT: Record<InscriptionSlotKey, string> = {
		cv: '.pdf',
		id_recto: '.pdf,.png,.jpg,.jpeg,.webp',
		id_verso: '.pdf,.png,.jpg,.jpeg,.webp'
	};
	let inscriptionInputs: Partial<Record<InscriptionSlotKey, HTMLInputElement>> = $state({});
	let inscriptionBusy = $state<InscriptionSlotKey | null>(null);

	function inscriptionHas(slot: InscriptionSlotKey): boolean {
		if (!edit) return false;
		if (slot === 'cv') return !!edit.hasCvDoc;
		if (slot === 'id_recto') return !!edit.hasIdRecto;
		return !!edit.hasIdVerso;
	}

	function markInscription(slot: InscriptionSlotKey, present: boolean) {
		if (!edit) return;
		if (slot === 'cv') edit.hasCvDoc = present;
		else if (slot === 'id_recto') edit.hasIdRecto = present;
		else edit.hasIdVerso = present;
	}

	async function uploadInscription(slot: InscriptionSlotKey) {
		if (!edit) return;
		const inp = inscriptionInputs[slot];
		const file = inp?.files?.[0];
		if (!file) {
			pushToast('Sélectionnez un fichier.', 'error');
			return;
		}
		inscriptionBusy = slot;
		const fd = new FormData();
		fd.set('candidatId', String(edit.id));
		fd.set('slot', slot);
		fd.set('file', file);
		try {
			const res = await fetch('?/updateInscriptionDoc', { method: 'POST', body: fd });
			if (!res.ok) throw new Error('upload failed');
			markInscription(slot, true);
			if (inp) inp.value = '';
			pushToast(`${INSCRIPTION_LABELS[slot]} mis à jour ✓`);
			onsaved?.();
		} catch {
			pushToast("Erreur lors de l'envoi", 'error');
		} finally {
			inscriptionBusy = null;
		}
	}

	async function removeInscription(slot: InscriptionSlotKey) {
		if (!edit) return;
		if (!confirm(`Supprimer ${INSCRIPTION_LABELS[slot]} ?`)) return;
		inscriptionBusy = slot;
		const fd = new FormData();
		fd.set('candidatId', String(edit.id));
		fd.set('slot', slot);
		try {
			const res = await fetch('?/removeInscriptionDoc', { method: 'POST', body: fd });
			if (!res.ok) throw new Error('remove failed');
			markInscription(slot, false);
			pushToast(`${INSCRIPTION_LABELS[slot]} supprimé`, 'info');
			onsaved?.();
		} catch {
			pushToast('Erreur', 'error');
		} finally {
			inscriptionBusy = null;
		}
	}

	function inscriptionPreviewUrl(slot: InscriptionSlotKey): string {
		return `/files/candidat/${edit!.id}/${slot}`;
	}

	// Le CV d'inscription est toujours un PDF ; les pièces d'identité peuvent être
	// pdf OU image — on s'appuie sur le type renseigné par le serveur (undefined →
	// inferKind sur l'URL, qui retombe sur 'pdf' par défaut).
	function inscriptionKind(slot: InscriptionSlotKey): 'pdf' | 'image' | undefined {
		if (slot === 'cv') return 'pdf';
		if (slot === 'id_recto') return edit?.idRectoKind;
		if (slot === 'id_verso') return edit?.idVersoKind;
		return undefined;
	}

	function fmtSize(b: number | null): string {
		if (!b) return '';
		if (b < 1024) return `${b} o`;
		if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} Ko`;
		return `${(b / (1024 * 1024)).toFixed(1)} Mo`;
	}

	const RECHERCHE_OPTS = [
		{ value: 'archive', label: 'Archive' },
		{ value: 'recherche', label: 'En recherche' },
		{ value: 'active', label: 'Recherche active' },
		{ value: 'entreprise', label: 'En entreprise' }
	];

	const localisation = $derived.by(() => {
		const c = edit ?? candidat;
		if (!c) return '';
		const ville = c.city ?? c.ville ?? '';
		return c.postal ? `${ville} (${c.postal})` : ville;
	});
</script>

{#snippet body()}
	{#if edit}
		<div class="cs-detail__head">
			<div class="cs-detail__avatar">{initials(edit.name)}</div>
			<div class="cs-detail__head-info">
				{#if editable}
					<div class="cs-detail__name-row">
						<input class="cs-detail__name-input" placeholder="Nom" bind:value={edit.lname} />
						<input class="cs-detail__name-input" placeholder="Prénom" bind:value={edit.fname} />
					</div>
				{:else}
					<p class="cs-detail__name">{edit.name}</p>
				{/if}
				<p class="cs-detail__sub">
					{edit.formation}{#if edit.formationCode} · {edit.formationCode}{/if}
					{#if edit.year} · Bac+{edit.year}{/if}
				</p>
				<p class="cs-detail__sub">
					{localisation}{#if edit.age != null} · {edit.age} ans{/if}
				</p>
			</div>
		</div>

		{#if !editable}
			{#if edit.email || edit.tel}
				<div class="cs-detail__contact">
					{#if edit.email}<span>📧 {edit.email}</span>{/if}
					{#if edit.tel}<span>📞 {edit.tel}</span>{/if}
				</div>
			{/if}

			<div class="cs-detail__stats">
				<div class="cs-detail__stat">
					<div class="cs-detail__stat-val" style:color={scoreColor(edit.score)}>
						{edit.score ?? '—'}{#if edit.score != null}<small>/100</small>{/if}
					</div>
					<div class="cs-detail__stat-lab">Score IA</div>
				</div>
			</div>

			{#if edit.rechercheStatut || edit.permis || edit.vehicule || edit.mobile}
				<div class="cs-detail__flags">
					{#if edit.rechercheStatut}
						<Badge label={rechercheStatutLabel(edit.rechercheStatut)} color={C.blueLight} textColor={C.blue} />
					{/if}
					{#if edit.permis}<Badge label="Permis B" color={C.greenLight} textColor={C.green} />{/if}
					{#if edit.vehicule}<Badge label="Véhiculé" color={C.greenLight} textColor={C.green} />{/if}
					{#if edit.mobile}<Badge label="Déménagement possible" color={C.greenLight} textColor={C.green} />{/if}
				</div>
			{/if}

			{#if edit.tags?.length && !hideTags}
				<div class="cs-detail__section">
					<p class="cs-detail__section-lab">Tags</p>
					<div class="cs-detail__chips">
						{#each edit.tags as t}
							<Badge label={t} color={C.orangeLight} textColor={C.orange} />
						{/each}
					</div>
				</div>
			{/if}

			{#if edit.skills?.length}
				<div class="cs-detail__section">
					<p class="cs-detail__section-lab">Compétences</p>
					<div class="cs-detail__chips">
						{#each edit.skills as s}
							<Badge label={s} color={C.purpleLight} textColor={C.purple} />
						{/each}
					</div>
				</div>
			{/if}
		{:else}
			<!-- ───────── Editable form ───────── -->
			<div class="cs-detail__grid">
				<label class="cs-detail__lbl">Email
					<input class="cs-detail__inp" value={edit.email ?? ''} disabled />
				</label>
				<label class="cs-detail__lbl">Téléphone
					<input class="cs-detail__inp" type="tel" bind:value={edit.tel} />
				</label>
				<label class="cs-detail__lbl">Date de naissance
					<input class="cs-detail__inp" type="date" bind:value={edit.birth} />
				</label>
				<label class="cs-detail__lbl">Formation
					<select class="cs-detail__inp" bind:value={edit.formationId}>
						<option value={null}>—</option>
						{#each formations as f}
							<option value={f.id}>{f.code} — {f.name}</option>
						{/each}
					</select>
				</label>
				<label class="cs-detail__lbl">Niveau
					<select class="cs-detail__inp" bind:value={edit.year}>
						<option value={null}>—</option>
						{#each [1, 2, 3, 4, 5] as n}
							<option value={n}>Bac+{n}</option>
						{/each}
					</select>
				</label>
				<label class="cs-detail__lbl">Ville
					<input class="cs-detail__inp" bind:value={edit.city} />
				</label>
				<label class="cs-detail__lbl">Code postal
					<input class="cs-detail__inp" bind:value={edit.postal} />
				</label>
				<label class="cs-detail__lbl">Score IA
					<input
						class="cs-detail__inp"
						type="number"
						value={edit.score ?? ''}
						readonly
						disabled
					/>
				</label>
				{#if !studentMode}
					<label class="cs-detail__lbl">Statut recherche
						<select class="cs-detail__inp" bind:value={edit.rechercheStatut}>
							{#each RECHERCHE_OPTS as o}
								<option value={o.value}>{o.label}</option>
							{/each}
						</select>
					</label>
					<label class="cs-detail__lbl">Titre de séjour — fin de validité
						<input class="cs-detail__inp" type="date" bind:value={edit.titreValide} />
					</label>
				{/if}
			</div>

			<div class="cs-detail__check-row">
				<label class="cs-detail__check">
					<input type="checkbox" bind:checked={edit.permis} /> Permis B
				</label>
				<label class="cs-detail__check">
					<input type="checkbox" bind:checked={edit.vehicule} /> Véhiculé
				</label>
				<label class="cs-detail__check">
					<input type="checkbox" bind:checked={edit.mobile} /> Déménagement possible
				</label>
			</div>

			{#if !hideTags}
				<div class="cs-detail__section">
					<p class="cs-detail__section-lab">Tags</p>
					<div class="cs-detail__chip-edit">
						{#each edit.tags ?? [] as t}
							<button class="cs-detail__chip cs-detail__chip--rem" type="button" onclick={() => removeTag(t)}>
								{t} <span>×</span>
							</button>
						{/each}
						<input
							class="cs-detail__chip-inp"
							placeholder="Ajouter un tag…"
							list="cs-detail-tagList"
							bind:value={tagInput}
							onchange={addTag}
							onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
							onblur={addTag}
						/>
						<datalist id="cs-detail-tagList">
							{#each tagSuggestions as t}<option value={t}></option>{/each}
						</datalist>
					</div>
				</div>
			{/if}

			<div class="cs-detail__section">
				<p class="cs-detail__section-lab">Compétences</p>
				<div class="cs-detail__chip-edit">
					{#each edit.skills ?? [] as s}
						<button class="cs-detail__chip cs-detail__chip--rem" type="button" onclick={() => removeSkill(s)}>
							{s} <span>×</span>
						</button>
					{/each}
					<input
						class="cs-detail__chip-inp"
						placeholder="Ajouter une compétence…"
						list="cs-detail-skillList"
						bind:value={skillInput}
						onchange={addSkill}
						onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
						onblur={addSkill}
					/>
					<datalist id="cs-detail-skillList">
						{#each skillSuggestions as s}<option value={s}></option>{/each}
					</datalist>
				</div>
			</div>
		{/if}

		{#if !hideFiles}
		<!-- Documents : preview + manage -->
		<div class="cs-detail__section">
			<p class="cs-detail__section-lab">Documents d'inscription</p>
			{#if editable && manageInscription}
				<div class="cs-detail__doc-rows">
					{#each ['cv', 'id_recto', 'id_verso'] as InscriptionSlotKey[] as slot (slot)}
						{@const present = inscriptionHas(slot)}
						{@const busy = inscriptionBusy === slot}
						<div class="cs-detail__doc-row">
							<div class="cs-detail__doc-row-head">
								<span class="cs-detail__doc-row-label">
									{INSCRIPTION_ICONS[slot]} {INSCRIPTION_LABELS[slot]}
								</span>
								{#if present}
									<span class="cs-detail__doc-row-status cs-detail__doc-row-status--ok">Déposé</span>
								{:else}
									<span class="cs-detail__doc-row-status">Absent</span>
								{/if}
							</div>
							<div class="cs-detail__doc-row-actions">
								{#if present}
									<button
										class="cs-detail__cv-btn"
										type="button"
										onclick={() => openPreview(inscriptionPreviewUrl(slot), INSCRIPTION_LABELS[slot], inscriptionKind(slot))}
									>
										Aperçu
									</button>
								{/if}
								<input
									class="cs-detail__inp cs-detail__inp--inline"
									type="file"
									accept={INSCRIPTION_ACCEPT[slot]}
									bind:this={inscriptionInputs[slot]}
									disabled={busy}
								/>
								<Button size="sm" onclick={() => uploadInscription(slot)} disabled={busy}>
									{busy ? '…' : present ? 'Remplacer' : 'Déposer'}
								</Button>
								{#if present}
									<button
										class="cs-detail__cv-btn cs-detail__cv-btn--del"
										type="button"
										onclick={() => removeInscription(slot)}
										disabled={busy}
									>
										×
									</button>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="cs-detail__docs">
					<button
						class="cs-detail__doc"
						class:cs-detail__doc--off={!edit.hasCvDoc}
						type="button"
						disabled={!edit.hasCvDoc}
						onclick={() => openPreview(`/files/candidat/${edit!.id}/cv`, 'CV d\'inscription', 'pdf')}
					>
						📄 CV inscription
					</button>
					<button
						class="cs-detail__doc"
						class:cs-detail__doc--off={!edit.hasIdRecto}
						type="button"
						disabled={!edit.hasIdRecto}
						onclick={() => openPreview(`/files/candidat/${edit!.id}/id_recto`, 'Pièce d\'identité (recto)', edit!.idRectoKind)}
					>
						🪪 ID recto
					</button>
					<button
						class="cs-detail__doc"
						class:cs-detail__doc--off={!edit.hasIdVerso}
						type="button"
						disabled={!edit.hasIdVerso}
						onclick={() => openPreview(`/files/candidat/${edit!.id}/id_verso`, 'Pièce d\'identité (verso)', edit!.idVersoKind)}
					>
						🪪 ID verso
					</button>
					<button
						class="cs-detail__doc"
						class:cs-detail__doc--off={!edit.pitch}
						type="button"
						disabled={!edit.pitch}
						onclick={() => openPreview(`/files/candidat/${edit!.id}/pitch`, 'Vidéo pitch', 'video')}
					>
						🎥 Vidéo pitch
					</button>
				</div>
			{/if}
			{#if edit.titreValide && !studentMode}
				<p class="cs-detail__hint">Titre de séjour — fin de validité : {edit.titreValide}</p>
			{/if}
		</div>

		<div class="cs-detail__section">
			<p class="cs-detail__section-lab">CVs ({edit.cvs.length})</p>
			<div class="cs-detail__cvs-list">
				{#if !edit.cvs.length}
					<span class="cs-detail__empty">Aucun CV.</span>
				{/if}
				{#each edit.cvs as c (c.id)}
					<div class="cs-detail__cv">
						<span class="cs-detail__cv-icon">📄</span>
						<div class="cs-detail__cv-body">
							<p class="cs-detail__cv-name">{c.name}</p>
							{#if c.size}<p class="cs-detail__cv-sub">{fmtSize(c.size)}</p>{/if}
						</div>
						<button
							class="cs-detail__cv-btn"
							type="button"
							disabled={!c.hasFile}
							onclick={() => openPreview(`/files/cv/${c.id}`, c.name, 'pdf')}
						>
							Aperçu
						</button>
						{#if editable && manageCvs}
							<button class="cs-detail__cv-btn cs-detail__cv-btn--del" type="button" onclick={() => deleteCv(c.id)}>
								×
							</button>
						{/if}
					</div>
				{/each}
			</div>

			{#if editable && manageCvs}
				<div class="cs-detail__cv-add">
					<input
						class="cs-detail__inp cs-detail__inp--inline"
						placeholder="Nom du CV"
						bind:value={newCvName}
					/>
					<input
						class="cs-detail__inp cs-detail__inp--inline"
						type="file"
						accept=".pdf"
						bind:this={newCvFile}
					/>
					<Button size="sm" onclick={uploadCv}>+ Ajouter</Button>
				</div>
			{/if}
		</div>
		{/if}

		{#if editable}
			<div class="cs-detail__footer">
				{#if ondelete}
					<Button
						variant="danger"
						onclick={() => (deleteConfirmOpen = true)}
						disabled={deleting || saving}
					>
						{deleting ? 'Suppression…' : deleteLabel}
					</Button>
				{/if}
				{#if onresetpassword}
					<Button
						variant="subtle"
						onclick={runReset}
						disabled={resetting || saving || deleting}
					>
						{resetting ? 'Envoi…' : resetLabel}
					</Button>
				{/if}
				{#if ondelete || onresetpassword}
					<div class="cs-detail__footer-spacer"></div>
				{/if}
				{#if !inline}
					<Button variant="subtle" onclick={onclose}>Annuler</Button>
				{/if}
				<Button onclick={save} disabled={saving || deleting}>
					{saving ? 'Enregistrement…' : 'Enregistrer'}
				</Button>
			</div>
		{/if}

		{#if footer}{@render footer()}{/if}
	{/if}
{/snippet}

{#if inline}
	<div class="cs-detail__inline">{@render body()}</div>
{:else}
	<Modal {open} {onclose} title={editable ? 'Éditer le profil' : 'Profil candidat'} width={editable ? 920 : 540}>
		{@render body()}
	</Modal>
{/if}

<Modal open={!!preview} onclose={() => (preview = null)} title={preview?.title ?? 'Aperçu'} width={900}>
	{#if preview}
		{#if preview.kind === 'pdf'}
			<iframe class="cs-detail__viewer" src={preview.url} title={preview.title}></iframe>
		{:else if preview.kind === 'video'}
			<!-- svelte-ignore a11y_media_has_caption -->
			<video class="cs-detail__viewer-video" src={preview.url} controls preload="metadata"></video>
		{:else}
			<img class="cs-detail__viewer-img" src={preview.url} alt={preview.title} />
		{/if}
		<div class="cs-detail__footer">
			<a class="cs-detail__dl" href={preview.url + (preview.url.includes('?') ? '&' : '?') + 'dl=1'}>
				Télécharger
			</a>
			<Button variant="subtle" onclick={() => (preview = null)}>Fermer</Button>
		</div>
	{/if}
</Modal>

<Confirm
	open={deleteConfirmOpen}
	onclose={() => (deleteConfirmOpen = false)}
	onconfirm={runDelete}
	title={deleteConfirmTitle}
	message={deleteConfirmMessage}
	danger
/>

<style>
	.cs-detail__inline {
		max-width: 920px;
		margin: 0 auto;
		background: var(--c-card);
		border: 1px solid var(--c-border);
		border-radius: 14px;
		padding: 22px 24px;
	}
	@media (max-width: 540px) {
		.cs-detail__inline {
			padding: 16px;
			border-radius: 10px;
		}
	}
	.cs-detail__head {
		display: flex;
		align-items: center;
		gap: 16px;
		margin-bottom: 16px;
	}
	.cs-detail__head-info {
		flex: 1;
		min-width: 0;
	}
	.cs-detail__avatar {
		width: 56px;
		height: 56px;
		border-radius: 14px;
		background: var(--c-blue-light);
		display: grid;
		place-items: center;
		font-weight: 800;
		font-size: 18px;
		color: var(--c-blue);
		flex-shrink: 0;
	}
	.cs-detail__name {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 18px;
		color: var(--c-text);
	}
	.cs-detail__name-row {
		display: flex;
		gap: 8px;
		margin-bottom: 4px;
	}
	.cs-detail__name-input {
		flex: 1;
		min-width: 0;
		padding: 6px 10px;
		border-radius: 8px;
		border: 1.5px solid var(--c-border);
		font-size: 15px;
		font-weight: 700;
		font-family: var(--font-display);
		background: var(--c-card);
		color: var(--c-text);
		outline: none;
	}
	.cs-detail__name-input:focus {
		border-color: var(--c-blue);
	}
	.cs-detail__sub {
		font-size: 13px;
		color: var(--c-muted);
	}
	.cs-detail__contact {
		display: flex;
		gap: 14px;
		flex-wrap: wrap;
		font-size: 12px;
		color: var(--c-sub);
		margin-bottom: 14px;
	}
	.cs-detail__stats {
		display: grid;
		grid-template-columns: 1fr;
		gap: 10px;
		margin-bottom: 14px;
	}
	.cs-detail__stat {
		background: var(--c-bg);
		border-radius: 10px;
		padding: 14px;
		text-align: center;
	}
	.cs-detail__stat-val {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 22px;
	}
	.cs-detail__stat-val small {
		font-size: 12px;
	}
	.cs-detail__stat-lab {
		font-size: 11px;
		color: var(--c-muted);
		margin-top: 2px;
	}
	.cs-detail__flags {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-bottom: 14px;
	}
	.cs-detail__section {
		margin-bottom: 16px;
	}
	.cs-detail__section-lab {
		font-size: 12px;
		font-weight: 700;
		color: var(--c-sub);
		margin-bottom: 8px;
		text-transform: uppercase;
		letter-spacing: 0.3px;
	}
	.cs-detail__chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.cs-detail__grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 12px;
		margin-bottom: 14px;
	}
	.cs-detail__lbl {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 12px;
		font-weight: 600;
		color: var(--c-sub);
	}
	.cs-detail__lbl span {
		color: var(--c-muted);
		font-weight: 500;
		font-size: 11px;
	}
	.cs-detail__inp {
		padding: 8px 12px;
		border-radius: 8px;
		border: 1.5px solid var(--c-border);
		font-size: 13px;
		background: var(--c-card);
		color: var(--c-text);
		outline: none;
		font-family: var(--font-body);
	}
	.cs-detail__inp:focus {
		border-color: var(--c-blue);
	}
	.cs-detail__inp:disabled {
		background: var(--c-bg);
		color: var(--c-muted);
		cursor: not-allowed;
	}
	.cs-detail__inp--inline {
		flex: 1 1 160px;
		min-width: 0;
	}
	.cs-detail__check-row {
		display: flex;
		gap: 14px;
		flex-wrap: wrap;
		margin-bottom: 14px;
		font-size: 13px;
		color: var(--c-sub);
	}
	.cs-detail__check {
		display: flex;
		align-items: center;
		gap: 6px;
		cursor: pointer;
	}
	.cs-detail__chip-edit {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		align-items: center;
	}
	.cs-detail__chip {
		padding: 5px 10px;
		border-radius: 99px;
		border: 1.5px solid var(--c-border);
		background: var(--c-card);
		font-size: 12px;
		color: var(--c-sub);
		font-weight: 600;
		cursor: pointer;
		font-family: var(--font-body);
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}
	.cs-detail__chip--rem span {
		color: var(--c-red);
		font-size: 14px;
		line-height: 1;
	}
	.cs-detail__chip-inp {
		flex: 0 0 160px;
		padding: 5px 10px;
		border-radius: 99px;
		border: 1.5px dashed var(--c-border-mid);
		background: transparent;
		font-size: 12px;
		font-family: var(--font-body);
		outline: none;
	}
	.cs-detail__chip-inp:focus {
		border-color: var(--c-blue);
		border-style: solid;
	}
	.cs-detail__docs {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.cs-detail__doc-rows {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.cs-detail__doc-row {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 10px 12px;
		border: 1px solid var(--c-border);
		border-radius: 10px;
		background: var(--c-bg);
	}
	.cs-detail__doc-row-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
	}
	.cs-detail__doc-row-label {
		font-size: 13px;
		font-weight: 600;
		color: var(--c-text);
	}
	.cs-detail__doc-row-status {
		font-size: 11px;
		font-weight: 700;
		padding: 2px 8px;
		border-radius: 99px;
		background: var(--c-border);
		color: var(--c-muted);
		text-transform: uppercase;
		letter-spacing: 0.3px;
	}
	.cs-detail__doc-row-status--ok {
		background: var(--c-green-light);
		color: var(--c-green);
	}
	.cs-detail__doc-row-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		align-items: center;
	}
	.cs-detail__doc {
		padding: 8px 12px;
		border-radius: 8px;
		border: 1.5px solid var(--c-border);
		background: var(--c-card);
		font-size: 13px;
		font-weight: 600;
		color: var(--c-sub);
		cursor: pointer;
		font-family: var(--font-body);
	}
	.cs-detail__doc:not(:disabled):hover {
		border-color: var(--c-blue);
		color: var(--c-blue);
		background: var(--c-blue-soft);
	}
	.cs-detail__doc--off,
	.cs-detail__doc:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.cs-detail__hint {
		margin-top: 8px;
		font-size: 12px;
		color: var(--c-muted);
	}
	.cs-detail__cvs-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.cs-detail__cv {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 12px;
		border-radius: 9px;
		border: 1px solid var(--c-border);
	}
	.cs-detail__cv-icon {
		font-size: 20px;
	}
	.cs-detail__cv-body {
		flex: 1;
		min-width: 0;
	}
	.cs-detail__cv-name {
		font-size: 13px;
		font-weight: 600;
		color: var(--c-text);
	}
	.cs-detail__cv-sub {
		font-size: 11px;
		color: var(--c-muted);
	}
	.cs-detail__cv-btn {
		padding: 5px 10px;
		border-radius: 7px;
		border: 1.5px solid var(--c-border);
		background: var(--c-card);
		font-size: 12px;
		font-weight: 600;
		color: var(--c-sub);
		cursor: pointer;
		font-family: var(--font-body);
	}
	.cs-detail__cv-btn:not(:disabled):hover {
		border-color: var(--c-blue);
		color: var(--c-blue);
	}
	.cs-detail__cv-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.cs-detail__cv-btn--del {
		color: var(--c-red);
		border-color: var(--c-red-light);
	}
	.cs-detail__cv-btn--del:hover {
		background: var(--c-red-light);
	}
	.cs-detail__cv-add {
		display: flex;
		gap: 8px;
		margin-top: 10px;
		flex-wrap: wrap;
		align-items: center;
	}
	.cs-detail__empty {
		font-size: 12px;
		color: var(--c-muted);
	}
	.cs-detail__footer {
		display: flex;
		gap: 10px;
		justify-content: flex-end;
		margin-top: 14px;
		padding-top: 14px;
		border-top: 1px solid var(--c-border);
		align-items: center;
		flex-wrap: wrap;
	}
	.cs-detail__footer-spacer {
		flex: 1;
	}
	.cs-detail__viewer {
		width: 100%;
		height: 70vh;
		border: 1px solid var(--c-border);
		border-radius: 10px;
		background: var(--c-bg);
	}
	.cs-detail__viewer-img {
		width: 100%;
		max-height: 70vh;
		object-fit: contain;
		border-radius: 10px;
		background: var(--c-bg);
	}
	.cs-detail__viewer-video {
		display: block;
		width: 100%;
		max-height: 70vh;
		border-radius: 10px;
		background: #000;
	}
	.cs-detail__dl {
		font-size: 13px;
		font-weight: 600;
		color: var(--c-blue);
		padding: 7px 12px;
		border-radius: 7px;
		box-shadow: inset 0 0 0 1.5px var(--c-blue);
	}
	.cs-detail__dl:hover {
		background: var(--c-blue-soft);
	}
	@media (max-width: 720px) {
		.cs-detail__grid {
			grid-template-columns: 1fr;
		}
	}
	@media (max-width: 540px) {
		.cs-detail__head {
			gap: 12px;
		}
		.cs-detail__avatar {
			width: 48px;
			height: 48px;
			font-size: 16px;
		}
		.cs-detail__name {
			font-size: 16px;
		}
		.cs-detail__contact {
			gap: 8px 14px;
		}
		.cs-detail__stat {
			padding: 12px 8px;
		}
		.cs-detail__stat-val {
			font-size: 20px;
		}
	}
</style>
