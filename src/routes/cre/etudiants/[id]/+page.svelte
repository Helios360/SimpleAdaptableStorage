<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Input from '$lib/components/Input.svelte';
	import CandidatDetail from '$lib/components/CandidatDetail.svelte';
	import { pushToast } from '$lib/stores/toast.svelte';
	import { initials, scoreColor, statutLabel, rechercheStatutLabel } from '$lib/utils';
	import {
		OPCO_LABELS,
		OPCO_ORGANISMES,
		opcoColor,
		situationLabel,
		diplomeLabel,
		SITUATIONS,
		DIPLOMES
	} from '$lib/placementLogic';
	import {
		checklistItemsForSchool,
		checklistProgress,
		type ChecklistState,
		type SchoolType
	} from '$lib/checklist';
	import { suggestionsParAnnee, trancheForAge, formatEuros, SMIC_MENSUEL_BRUT } from '$lib/salaire';
	import { C } from '$lib/tokens';
	import type { PageData } from './$types';
	import type { CandidatView } from '$lib/components/CandidatDetail.svelte';

	let { data }: { data: PageData } = $props();

	// Vue lecture seule (façon aperçu CVthèque) via ?view=1, sinon édition complète.
	const preview = $derived($page.url.searchParams.get('view') === '1');
	const candidat = $derived(data.candidat as CandidatView);

	// ───────── Onglets ─────────
	// Synthèse : vue d'ensemble (mini fiches + checklist). Les onglets Entreprise et
	// École attendent encore leur modèle de données — on affiche la structure et un
	// bandeau « à venir » en attendant.
	type TabKey = 'synthese' | 'apprenant' | 'entreprise' | 'ecole';
	const TABS: { key: TabKey; label: string; icon: string }[] = [
		{ key: 'synthese', label: 'Synthèse', icon: '🧭' },
		{ key: 'apprenant', label: 'Apprenant', icon: '🎓' },
		{ key: 'entreprise', label: 'Entreprise', icon: '🏢' },
		{ key: 'ecole', label: 'École', icon: '🏫' }
	];
	let activeTab = $state<TabKey>('synthese');

	// Localisation lisible pour les mini fiches.
	const localisation = $derived.by(() => {
		const c = candidat;
		const ville = c.city ?? c.ville ?? '';
		return c.postal ? `${ville} (${c.postal})` : ville;
	});

	// Checklist « dossier » stockée (JSONB candidat.checklist). Copie locale
	// réactive, persistée à chaque toggle via l'action updateChecklist. Les items
	// affichés dépendent du type d'école (Discord / plateforme e-learning).
	let checklist = $state<ChecklistState>({ ...data.checklist });
	const checklistItems = $derived(checklistItemsForSchool(data.schoolType as SchoolType));
	const checklistProg = $derived(checklistProgress(data.schoolType as SchoolType, checklist));

	async function toggleChecklist(key: string, value: boolean) {
		const prev = checklist;
		checklist = { ...checklist, [key]: value };
		const fd = new FormData();
		fd.set('id', String(candidat.id));
		fd.set('checklist', JSON.stringify(checklist));
		const res = await fetch('?/updateChecklist', { method: 'POST', body: fd });
		if (!res.ok) {
			pushToast('Erreur lors de l\'enregistrement de la checklist', 'error');
			checklist = prev;
		}
	}

	const statColor: Record<string, { bg: string; fg: string }> = {
		valide: { bg: C.greenLight, fg: C.green },
		en_attente: { bg: C.orangeLight, fg: C.orange },
		refuse: { bg: C.redLight, fg: C.red }
	};
	const sc = $derived(statColor[candidat.statut] ?? { bg: C.bg, fg: C.muted });

	async function submitStatut(statut: 'valide' | 'refuse') {
		const fd = new FormData();
		fd.set('id', String(candidat.id));
		fd.set('statut', statut);
		const res = await fetch('?/setStatut', { method: 'POST', body: fd });
		if (!res.ok) {
			pushToast('Action impossible.', 'error');
			return;
		}
		pushToast(
			statut === 'valide' ? 'Dossier validé ✓' : 'Dossier refusé',
			statut === 'valide' ? 'success' : 'error'
		);
		await goto('/cre/etudiants');
	}

	// ───────── Passation en entreprise (formulaire commercial) ─────────
	const placements = $derived(data.placements ?? []);
	const lastPlacement = $derived(placements[0] ?? null);

	// Fiches soumises via les liens tokenisés (affichées en lecture seule).
	const ficheEtu = $derived(data.ficheEtudiant ?? null);
	const ficheEnt = $derived(data.ficheEntreprise ?? null);

	// ───────── Suggestion de salaire (grille légale × âge) ─────────
	// Le type de contrat vient de la fiche entreprise si elle est arrivée, sinon
	// de la passation ; à défaut on suppose un contrat d'apprentissage.
	const typeContratSalaire = $derived(
		ficheEnt?.typeContrat ?? lastPlacement?.typeContrat ?? 'apprentissage'
	);
	const trancheSalaire = $derived(trancheForAge(candidat.age, typeContratSalaire));
	const salaires = $derived(suggestionsParAnnee(candidat.age, typeContratSalaire));

	let passOpen = $state(false);
	let passLoading = $state(false);
	let passError = $state<string | null>(null);
	let pPromo = $state('');
	let pSource = $state('');
	let pSuiviPar = $state('');
	let pDate = $state('');
	let pEntreprise = $state('');
	let pContactNom = $state('');
	let pContactPrenom = $state('');
	let pContactTel = $state('');
	let pContactEmail = $state('');
	let pTypeContrat = $state('');
	let pStatutOpco = $state('en_attente');

	function resetPassForm() {
		pPromo = '';
		// « Source » et « Suivi par » présélectionnés sur le commercial connecté.
		pSource = data.currentUserName ?? '';
		pSuiviPar = data.currentUserName ?? '';
		pDate = '';
		pEntreprise = '';
		pContactNom = '';
		pContactPrenom = '';
		pContactTel = '';
		pContactEmail = '';
		pTypeContrat = '';
		pStatutOpco = 'en_attente';
		passError = null;
	}

	function openPassation() {
		resetPassForm();
		passOpen = true;
	}

	async function submitPassation(e: SubmitEvent) {
		e.preventDefault();
		passError = null;
		// Tous les champs sont obligatoires.
		const required: [string, string][] = [
			[pPromo, 'Promo'],
			[pSource, 'Source'],
			[pSuiviPar, 'Suivi par'],
			[pDate, 'Date de placement'],
			[pEntreprise, 'Entreprise'],
			[pContactNom, 'Contact — Nom'],
			[pContactPrenom, 'Contact — Prénom'],
			[pContactTel, 'Téléphone'],
			[pContactEmail, 'Email entreprise'],
			[pTypeContrat, 'Type de contrat']
		];
		const missing = required.find(([v]) => !v.trim());
		if (missing) {
			passError = `Champ requis : ${missing[1]}.`;
			return;
		}
		const fd = new FormData();
		fd.set('candidatId', String(candidat.id));
		// Le select porte l'id de la promo ; le libellé part avec, il reste stocké
		// en clair pour survivre à une suppression du référentiel.
		fd.set('promoId', pPromo);
		fd.set('promo', data.promos.find((pr) => String(pr.id) === pPromo)?.label ?? '');
		fd.set('source', pSource);
		fd.set('suiviPar', pSuiviPar);
		fd.set('datePlacement', pDate);
		fd.set('entreprise', pEntreprise);
		fd.set('contactNom', pContactNom);
		fd.set('contactPrenom', pContactPrenom);
		fd.set('contactTel', pContactTel);
		fd.set('contactEmail', pContactEmail);
		fd.set('typeContrat', pTypeContrat);
		fd.set('statutOpco', pStatutOpco);
		passLoading = true;
		try {
			const res = await fetch('?/createPlacement', { method: 'POST', body: fd });
			const json = await res.json().catch(() => null);
			const parsed = json?.data ? JSON.parse(json.data) : null;
			const payload = Array.isArray(parsed) ? parsed[0] : parsed;
			if (json?.type === 'failure' || (json?.status ?? 200) >= 400) {
				passError = payload?.error ?? 'Erreur lors de la passation.';
				return;
			}
			passOpen = false;
			await invalidateAll();
			pushToast('Placement créé · liens envoyés ✓', 'success');
		} catch (err) {
			console.error(err);
			passError = 'Erreur réseau.';
		} finally {
			passLoading = false;
		}
	}

	async function changeStatutOpco(placementId: number, value: string) {
		const fd = new FormData();
		fd.set('placementId', String(placementId));
		fd.set('statutOpco', value);
		const res = await fetch('?/setStatutOpco', { method: 'POST', body: fd });
		if (!res.ok) {
			pushToast('Impossible de modifier le statut OPCO.', 'error');
			return;
		}
		await invalidateAll();
		pushToast('Statut OPCO mis à jour ✓', 'success');
	}

	// Date de prise en charge OPCO : éditable directement depuis la synthèse
	// (champ date du placement, vide = pas encore de prise en charge).
	async function changePriseEnCharge(placementId: number, value: string) {
		const fd = new FormData();
		fd.set('placementId', String(placementId));
		fd.set('priseEnCharge', value);
		const res = await fetch('?/setPriseEnCharge', { method: 'POST', body: fd });
		if (!res.ok) {
			pushToast('Impossible d\'enregistrer la date de prise en charge.', 'error');
			return;
		}
		await invalidateAll();
		pushToast('Date de prise en charge enregistrée ✓', 'success');
	}

	// ───────── Note interne (partagée par toute l'équipe CRE) ─────────
	// Une seule note par étudiant : n'importe quel CRE peut la compléter, le
	// dossier garde l'auteur du dernier enregistrement.
	let note = $state(data.note ?? '');
	let savingNote = $state(false);
	// L'attribution suit la donnée rechargée, pas une copie locale.
	const noteAuthor = $derived(data.noteAuthor);
	const noteUpdatedAt = $derived(data.noteUpdatedAt);
	const noteDirty = $derived(note !== (data.note ?? ''));

	async function saveNote() {
		savingNote = true;
		const fd = new FormData();
		fd.set('id', String(candidat.id));
		fd.set('note', note);
		try {
			const res = await fetch('?/saveNote', { method: 'POST', body: fd });
			if (!res.ok) throw new Error();
			await invalidateAll();
			pushToast('Note enregistrée ✓', 'success');
		} catch {
			pushToast("Erreur lors de l'enregistrement de la note", 'error');
		} finally {
			savingNote = false;
		}
	}

	/** Date courte « 12 mars 2026 » (les dates du suivi des liens arrivent en Date). */
	function fmtDate(d: Date | string | null | undefined): string {
		if (!d) return '—';
		const date = d instanceof Date ? d : new Date(d);
		if (Number.isNaN(date.getTime())) return '—';
		return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
	}

	async function resendLinks(placementId: number) {
		const fd = new FormData();
		fd.set('placementId', String(placementId));
		const res = await fetch('?/resendPlacementLinks', { method: 'POST', body: fd });
		if (res.ok) {
			pushToast('Liens renvoyés ✓', 'success');
		} else {
			pushToast("Échec de l'envoi des liens", 'error');
		}
	}

	// ─── Édition des fiches directement depuis le dossier (côté CRE) ─────────
	// Les documents (…Path) et l'horodatage de soumission restent gérés via le
	// flux tokenisé : ici on ne modifie que les champs scalaires.
	type Draft = Record<string, string | number | boolean | null | undefined>;

	const CIVILITE_OPTS: [string, string][] = [
		['femme', 'Femme'],
		['homme', 'Homme'],
		['na', 'Non renseigné']
	];
	const NATIONALITE_OPTS: [string, string][] = [
		['francaise', 'Française'],
		['ue', 'Union européenne'],
		['hors_ue', 'Hors UE']
	];
	const CONTRAT_OPTS: [string, string][] = [
		['apprentissage', 'Apprentissage'],
		['professionnalisation', 'Professionnalisation']
	];

	let editEtu = $state(false);
	let etuDraft = $state<Draft>({});
	let savingEtu = $state(false);

	let editEnt = $state(false);
	let entDraft = $state<Draft>({});
	let savingEnt = $state(false);

	function startEditEtu() {
		etuDraft = { ...(ficheEtu ?? {}) };
		editEtu = true;
	}

	function startEditEnt() {
		entDraft = { ...(ficheEnt ?? {}) };
		editEnt = true;
	}

	async function saveEtu() {
		savingEtu = true;
		const ok = await submitFiche('updateFicheEtudiant', 'candidatId', candidat.id, etuDraft, "Fiche d'informations mise à jour ✓");
		if (ok) editEtu = false;
		savingEtu = false;
	}

	async function saveEnt() {
		if (!lastPlacement) return;
		savingEnt = true;
		const ok = await submitFiche('updateFicheEntreprise', 'placementId', lastPlacement.id, entDraft, 'Fiche entreprise mise à jour ✓');
		if (ok) editEnt = false;
		savingEnt = false;
	}

	// POST d'un brouillon vers une action serveur ; renvoie true si sauvegardé.
	async function submitFiche(
		action: string,
		idField: string,
		idValue: number,
		draft: Draft,
		successMsg: string
	): Promise<boolean> {
		const fd = new FormData();
		fd.set(idField, String(idValue));
		appendDraft(fd, draft);
		try {
			const res = await fetch(`?/${action}`, { method: 'POST', body: fd });
			if (!res.ok) throw new Error();
			await invalidateAll();
			pushToast(successMsg, 'success');
			return true;
		} catch {
			pushToast('Erreur lors de la sauvegarde', 'error');
			return false;
		}
	}

	// Sérialise un brouillon : les booléens absents valent « false » côté serveur,
	// on n'envoie donc que ceux à true ; les valeurs vides sont omises.
	function appendDraft(fd: FormData, draft: Draft) {
		for (const [k, v] of Object.entries(draft)) {
			if (typeof v === 'boolean') {
				if (v) fd.set(k, '1');
			} else if (v != null && String(v) !== '') {
				fd.set(k, String(v));
			}
		}
	}
</script>

<svelte:head>
	<title>{candidat.name} · Étudiant</title>
</svelte:head>

<!-- Champs d'édition réutilisables pour les deux fiches. -->
{#snippet fText(
	draft: Draft,
	label: string,
	key: string,
	type: string = 'text',
	maxlength?: number,
	digitsOnly: boolean = false
)}
	<label class="cs-fedit__lbl">
		{label}
		<input
			class="cs-fedit__inp"
			{type}
			{maxlength}
			inputmode={digitsOnly ? 'numeric' : undefined}
			value={draft[key] ?? ''}
			oninput={(e) => {
				let v = e.currentTarget.value;
				if (digitsOnly) v = v.replace(/\D/g, '');
				draft[key] = v;
				e.currentTarget.value = v;
			}}
		/>
	</label>
{/snippet}
{#snippet fSelect(draft: Draft, label: string, key: string, opts: [string, string][])}
	<label class="cs-fedit__lbl">
		{label}
		<select
			class="cs-fedit__inp"
			value={draft[key] ?? ''}
			onchange={(e) => (draft[key] = e.currentTarget.value)}
		>
			<option value="">—</option>
			{#each opts as [v, l]}<option value={v}>{l}</option>{/each}
		</select>
	</label>
{/snippet}
{#snippet fBool(draft: Draft, label: string, key: string)}
	<label class="cs-fedit__check">
		<input
			type="checkbox"
			checked={!!draft[key]}
			onchange={(e) => (draft[key] = e.currentTarget.checked)}
		/>
		{label}
	</label>
{/snippet}

<div class="cs-detail-page">
	<div class="cs-detail-page__bar">
		<a class="cs-detail-page__back" href="/cre/etudiants">← Retour à la liste</a>
	</div>

	<div class="cs-etu__tabs" role="tablist">
		{#each TABS as t}
			<button
				class="cs-etu__tab"
				class:cs-etu__tab--active={activeTab === t.key}
				role="tab"
				aria-selected={activeTab === t.key}
				onclick={() => (activeTab = t.key)}
			>
				<span aria-hidden="true">{t.icon}</span> {t.label}
			</button>
		{/each}
	</div>

	<!-- ───────── Synthèse ───────── -->
	{#if activeTab === 'synthese'}
		<div class="cs-syn">
			<!-- Mini fiche apprenant -->
			<Card padding="18px">
				<div class="cs-syn__card-head">
					<span class="cs-syn__card-title">🎓 Apprenant</span>
					<button class="cs-syn__link" type="button" onclick={() => (activeTab = 'apprenant')}>
						Voir tout →
					</button>
				</div>
				<div class="cs-syn__student">
					<div class="cs-syn__avatar">{initials(candidat.name)}</div>
					<div class="cs-syn__student-info">
						<p class="cs-syn__name">{candidat.name}</p>
						<p class="cs-syn__muted">
							{candidat.formation}{#if candidat.formationCode} · {candidat.formationCode}{/if}
							{#if candidat.year} · Bac+{candidat.year}{/if}
						</p>
						{#if lastPlacement?.promo}<p class="cs-syn__muted">🎓 Promo {lastPlacement.promo}</p>{/if}
						{#if localisation}<p class="cs-syn__muted">📍 {localisation}</p>{/if}
					</div>
					<div class="cs-syn__score" style:color={scoreColor(candidat.score)}>
						{candidat.score ?? '—'}<small>/100</small>
					</div>
				</div>
				<div class="cs-syn__flags">
					<Badge label={statutLabel(candidat.statut)} color={sc.bg} textColor={sc.fg} />
					{#if candidat.rechercheStatut}
						<Badge
							label={rechercheStatutLabel(candidat.rechercheStatut)}
							color={C.blueLight}
							textColor={C.blue}
						/>
					{/if}
					{#if candidat.permis}<Badge label="Permis B" color={C.greenLight} textColor={C.green} />{/if}
					{#if candidat.vehicule}<Badge label="Véhiculé" color={C.greenLight} textColor={C.green} />{/if}
				</div>
				<div class="cs-syn__contact">
					{#if candidat.email}<span>📧 {candidat.email}</span>{/if}
					{#if candidat.tel}<span>📞 {candidat.tel}</span>{/if}
				</div>
			</Card>

			<!-- Mini fiche entreprise -->
			<Card padding="18px">
				<div class="cs-syn__card-head">
					<span class="cs-syn__card-title">🏢 Entreprise</span>
					<button class="cs-syn__link" type="button" onclick={() => (activeTab = 'entreprise')}>
						Voir tout →
					</button>
				</div>
				{#if lastPlacement}
					{@const oc = opcoColor(lastPlacement.statutOpco)}
					{@const contactNom = [lastPlacement.contactPrenom, lastPlacement.contactNom]
						.filter(Boolean)
						.join(' ')}
					<div class="cs-syn__ent">
						<p class="cs-syn__name">{lastPlacement.entreprise ?? 'Entreprise'}</p>
						{#if lastPlacement.typeContrat}
							<p class="cs-syn__muted">
								{lastPlacement.typeContrat === 'apprentissage'
									? 'Apprentissage'
									: 'Professionnalisation'}
							</p>
						{/if}
					</div>
					<!-- Contact entreprise saisi à la passation (interlocuteur du dossier). -->
					<div class="cs-syn__contact-block">
						<p class="cs-syn__contact-lab">Contact entreprise</p>
						{#if contactNom}<p class="cs-syn__contact-name">{contactNom}</p>{/if}
						<div class="cs-syn__contact">
							{#if lastPlacement.contactEmail}
								<a href={`mailto:${lastPlacement.contactEmail}`}>📧 {lastPlacement.contactEmail}</a>
							{/if}
							{#if lastPlacement.contactTel}
								<a href={`tel:${lastPlacement.contactTel}`}>📞 {lastPlacement.contactTel}</a>
							{/if}
						</div>
						{#if !contactNom && !lastPlacement.contactEmail && !lastPlacement.contactTel}
							<p class="cs-syn__muted">Aucun contact renseigné</p>
						{/if}
					</div>
					<div class="cs-syn__opco">
						<label class="cs-syn__muted" for="syn-opco">Statut OPCO</label>
						<select
							id="syn-opco"
							class="cs-syn__opco-select"
							style:background={oc.bg}
							style:color={oc.fg}
							style:border-color={oc.border}
							value={lastPlacement.statutOpco}
							onchange={(e) => changeStatutOpco(lastPlacement.id, e.currentTarget.value)}
						>
							{#each Object.entries(OPCO_LABELS) as [value, label]}
								<option {value}>{label}</option>
							{/each}
						</select>
					</div>
					<div class="cs-syn__opco">
						<label class="cs-syn__muted" for="syn-pec">Date de prise en charge</label>
						<input
							id="syn-pec"
							class="cs-syn__opco-select"
							type="date"
							value={lastPlacement.priseEnCharge ?? ''}
							onchange={(e) => changePriseEnCharge(lastPlacement.id, e.currentTarget.value)}
						/>
					</div>
				{:else}
					<div class="cs-syn__placeholder">
						<p class="cs-syn__ph-title">Aucune entreprise rattachée</p>
						<p class="cs-syn__muted">Placez l'étudiant en entreprise depuis l'onglet École.</p>
					</div>
				{/if}
			</Card>

			<!-- Mini fiche école + checklist progression -->
			<Card padding="18px">
				<div class="cs-syn__card-head">
					<span class="cs-syn__card-title">🏫 École</span>
					<button class="cs-syn__link" type="button" onclick={() => (activeTab = 'ecole')}>
						Voir tout →
					</button>
				</div>
				<div class="cs-syn__progress">
					<div class="cs-syn__progress-top">
						<span class="cs-syn__muted">Checklist dossier</span>
						<span class="cs-syn__progress-count">
							{checklistProg.done}/{checklistProg.total}
						</span>
					</div>
					<div class="cs-syn__bar">
						<div
							class="cs-syn__bar-fill"
							style:width={`${checklistProg.total ? (checklistProg.done / checklistProg.total) * 100 : 0}%`}
						></div>
					</div>
				</div>
				<ul class="cs-syn__checklist">
					{#each checklistItems as item, i (item.key)}
						{#if item.group && item.group !== checklistItems[i - 1]?.group}
							<li class="cs-syn__check-group">{item.group}</li>
						{/if}
						<li>
							<label
								class="cs-syn__check cs-syn__check--toggle"
								class:cs-syn__check--done={checklist[item.key]}
								class:cs-syn__check--sub={!!item.group}
							>
								<input
									type="checkbox"
									class="cs-syn__check-box"
									checked={!!checklist[item.key]}
									onchange={(e) => toggleChecklist(item.key, e.currentTarget.checked)}
								/>
								<span>{item.label}</span>
							</label>
						</li>
					{/each}
				</ul>
			</Card>

			<!-- Note interne : une par étudiant, lisible et modifiable par tous les CRE. -->
			<Card padding="18px" class="cs-syn__note-card">
				<div class="cs-syn__card-head">
					<span class="cs-syn__card-title">🗒️ Note de suivi</span>
					<span class="cs-syn__muted">Équipe CRE</span>
				</div>
				<textarea
					class="cs-note__inp"
					rows="4"
					placeholder="Contexte, points d'attention, échanges avec l'entreprise… (visible par toute l'équipe, jamais par l'étudiant)"
					bind:value={note}
					readonly={preview}
				></textarea>
				<div class="cs-note__foot">
					<span class="cs-syn__muted">
						{#if noteAuthor}
							Dernière modification par {noteAuthor}
							{#if noteUpdatedAt} le {fmtDate(noteUpdatedAt)}{/if}
						{:else}
							Aucune note pour le moment.
						{/if}
					</span>
					{#if !preview}
						<Button size="sm" onclick={saveNote} disabled={savingNote || !noteDirty}>
							{savingNote ? 'Enregistrement…' : 'Enregistrer'}
						</Button>
					{/if}
				</div>
			</Card>
		</div>
	{/if}

	<!-- ───────── Apprenant ───────── -->
	{#if activeTab === 'apprenant'}
		<CandidatDetail
			{candidat}
			open
			inline
			flat
			editable={!preview}
			onclose={() => goto('/cre/etudiants')}
			formations={data.formations}
			tagSuggestions={data.defaultTags}
			skillSuggestions={data.defaultSkills}
			beforeTags={ficheEtuCard}
			onsaved={() => invalidateAll()}
			deleteLabel="Supprimer le compte"
			deleteConfirmTitle={`Supprimer ${candidat.name} ?`}
			deleteConfirmMessage="Le compte, le dossier et tous les fichiers seront effacés définitivement."
			resetLabel="Envoyer un lien de reset"
			onresetpassword={async () => {
				const fd = new FormData();
				fd.set('id', String(candidat.id));
				const res = await fetch('?/sendReset', { method: 'POST', body: fd });
				if (res.ok) {
					pushToast(`Lien de réinitialisation envoyé à ${candidat.email}`, 'success');
				} else {
					pushToast("Échec de l'envoi du lien de reset", 'error');
				}
			}}
			ondelete={async () => {
				const fd = new FormData();
				fd.set('id', String(candidat.id));
				const res = await fetch('?/deleteStudent', { method: 'POST', body: fd });
				if (res.ok) {
					pushToast(`${candidat.name} supprimé`, 'info');
					await goto('/cre/etudiants');
				} else {
					pushToast('Erreur lors de la suppression', 'error');
				}
			}}
		>
			{#snippet footer()}
				{#if candidat.statut === 'en_attente'}
					<div class="cs-detail-page__actions">
						<Button fullWidth onclick={() => submitStatut('valide')}>Valider le dossier</Button>
						<Button fullWidth variant="danger" onclick={() => submitStatut('refuse')}>Refuser</Button>
					</div>
				{/if}
			{/snippet}
		</CandidatDetail>

	{/if}

	{#snippet ficheEtuCard()}
		<Card padding="18px" class="cs-fiche-card">
			<div class="cs-syn__card-head">
				<span class="cs-syn__card-title">📋 Fiche d'informations</span>
				<div class="cs-fiche__head-actions">
					{#if ficheEtu?.submittedAt}<Badge label="Reçue" color={C.greenLight} textColor={C.green} />{/if}
					{#if !preview}
						{#if editEtu}
							<Button size="sm" variant="subtle" onclick={() => (editEtu = false)}>Annuler</Button>
							<Button size="sm" onclick={saveEtu} disabled={savingEtu}>
								{savingEtu ? 'Enregistrement…' : 'Enregistrer'}
							</Button>
						{:else}
							<Button size="sm" variant="subtle" icon="✏️" onclick={startEditEtu}>
								{ficheEtu ? 'Modifier' : 'Compléter'}
							</Button>
						{/if}
					{/if}
				</div>
			</div>
			<!-- Suggestion de rémunération : grille légale appliquée à l'âge de l'étudiant. -->
			<div class="cs-sal">
				<div class="cs-sal__head">
					<span class="cs-sal__title">💶 Salaire minimum suggéré</span>
					{#if candidat.age != null}
						<span class="cs-sal__meta">
							{candidat.age} ans{#if trancheSalaire} · {trancheSalaire.label}{/if} ·
							{typeContratSalaire === 'professionnalisation' ? 'Professionnalisation' : 'Apprentissage'}
						</span>
					{/if}
				</div>
				{#if salaires.length}
					<div class="cs-sal__rows">
						{#each salaires as s (s.annee)}
							<div class="cs-sal__row">
								<span class="cs-sal__annee">{s.annee}<sup>{s.annee === 1 ? 're' : 'e'}</sup> année</span>
								<span class="cs-sal__montant">{formatEuros(s.montant)}</span>
								<span class="cs-sal__pct">{s.pct} % du SMIC</span>
							</div>
						{/each}
					</div>
					<p class="cs-sal__note">
						Base SMIC {formatEuros(Math.round(SMIC_MENSUEL_BRUT))} brut/mois (35 h). Montants
						indicatifs : le salaire versé peut être supérieur, et le SMC de la branche s'applique
						s'il est plus favorable.
					</p>
				{:else}
					<p class="cs-sal__note">
						Date de naissance manquante — renseignez-la dans la fiche apprenant pour obtenir la
						suggestion.
					</p>
				{/if}
			</div>

			{#if editEtu}
				<div class="cs-fedit__grid">
					{@render fSelect(etuDraft, 'Civilité', 'civilite', CIVILITE_OPTS)}
					{@render fText(etuDraft, 'Nom de naissance', 'nomNaissance')}
					{@render fText(etuDraft, "Nom d'usage", 'nomUsage')}
					{@render fSelect(etuDraft, 'Nationalité', 'nationalite', NATIONALITE_OPTS)}
					{@render fText(etuDraft, 'Pays de naissance', 'paysNaissance')}
					{@render fText(etuDraft, 'Commune de naissance', 'communeNaissance')}
					{@render fText(etuDraft, 'Code postal de naissance', 'cpNaissance', 'text', 5, true)}
					{@render fText(etuDraft, 'Adresse (numéro et voie)', 'adresseRue')}
					{@render fText(etuDraft, 'Code postal', 'adresseCp', 'text', 5, true)}
					{@render fText(etuDraft, 'Ville', 'adresseVille')}
					{@render fText(etuDraft, 'NIR', 'nir', 'text', 15, true)}
					{@render fSelect(etuDraft, 'Situation avant contrat', 'situationAvantContrat', SITUATIONS)}
					{@render fSelect(etuDraft, 'Dernier diplôme préparé', 'dernierDiplomePrepare', DIPLOMES)}
					{@render fText(etuDraft, 'Intitulé du diplôme', 'intituleDiplomePrepare')}
					{@render fSelect(etuDraft, 'Diplôme le plus élevé', 'diplomeLePlusEleve', DIPLOMES)}
					{@render fText(etuDraft, 'Dernière année suivie', 'derniereAnneeSuivie')}
					{@render fText(etuDraft, 'Numéro DECA', 'numeroDeca')}
				</div>
				<div class="cs-fedit__checks">
					{@render fBool(etuDraft, 'Majeur', 'majeur')}
					{@render fBool(etuDraft, 'Déjà en alternance', 'dejaAlternance')}
					{@render fBool(etuDraft, 'Sportif haut niveau', 'sportifHautNiveau')}
					{@render fBool(etuDraft, 'RQTH', 'rqth')}
				</div>

				<p class="cs-fiche__sub">Représentant légal (si mineur)</p>
				<div class="cs-fedit__grid">
					{@render fText(etuDraft, 'Nom', 'repNom')}
					{@render fText(etuDraft, 'Prénom', 'repPrenom')}
					{@render fText(etuDraft, 'Email', 'repMail', 'email')}
					{@render fText(etuDraft, 'Téléphone', 'repTel', 'tel', 10, true)}
					{@render fText(etuDraft, 'Adresse', 'repAdresse')}
				</div>
			{:else if ficheEtu}
				<div class="cs-pl__grid">
					<div><span>Nom de naissance</span>{ficheEtu.nomNaissance ?? '—'}</div>
					<div><span>Nom d'usage</span>{ficheEtu.nomUsage ?? '—'}</div>
					<div><span>Civilité</span>{ficheEtu.civilite ?? '—'}</div>
					<div><span>Naissance</span>{`${ficheEtu.communeNaissance ?? ''} ${ficheEtu.cpNaissance ?? ''} ${ficheEtu.paysNaissance ?? ''}`.trim() || '—'}</div>
					<div><span>Adresse</span>{`${ficheEtu.adresseRue ?? ''} ${ficheEtu.adresseCp ?? ''} ${ficheEtu.adresseVille ?? ''}`.trim() || '—'}</div>
					<div><span>NIR</span>{ficheEtu.nir ?? '—'}</div>
					<div><span>Nationalité</span>{ficheEtu.nationalite ?? '—'}</div>
					<div><span>Majeur</span>{ficheEtu.majeur === false ? 'Non (mineur)' : 'Oui'}</div>
					<div><span>Situation avant contrat</span>{situationLabel(ficheEtu.situationAvantContrat)}</div>
					<div><span>Dernier diplôme préparé</span>{diplomeLabel(ficheEtu.dernierDiplomePrepare)}</div>
					<div><span>Diplôme le plus élevé</span>{diplomeLabel(ficheEtu.diplomeLePlusEleve)}</div>
					<div><span>Intitulé diplôme</span>{ficheEtu.intituleDiplomePrepare ?? '—'}</div>
					<div><span>Déjà en alternance</span>{ficheEtu.dejaAlternance ? `Oui (DECA ${ficheEtu.numeroDeca ?? '—'})` : 'Non'}</div>
				</div>

				{#if ficheEtu.majeur === false}
					<p class="cs-fiche__sub">Représentant légal</p>
					<div class="cs-pl__grid">
						<div><span>Nom / Prénom</span>{`${ficheEtu.repPrenom ?? ''} ${ficheEtu.repNom ?? ''}`.trim() || '—'}</div>
						<div><span>Email</span>{ficheEtu.repMail ?? '—'}</div>
						<div><span>Téléphone</span>{ficheEtu.repTel ?? '—'}</div>
						<div><span>Adresse</span>{ficheEtu.repAdresse ?? '—'}</div>
					</div>
				{/if}

				<div class="cs-fiche__flags">
					{#if ficheEtu.sportifHautNiveau}<Badge label="Sportif haut niveau" color={C.blueLight} textColor={C.blue} />{/if}
					{#if ficheEtu.rqth}<Badge label="RQTH" color={C.blueLight} textColor={C.blue} />{/if}
				</div>

				<p class="cs-fiche__sub">Documents</p>
				<div class="cs-fiche__docs">
					{#each [['titreSejourPath', "Carte d'identité / titre de séjour"], ['carteVitalePath', 'Carte vitale'], ['diplomePath', 'Diplôme / relevé'], ['photoIdPath', "Photo d'identité"], ['reglementInterieurPath', 'Règlement intérieur'], ['attestationSportifPath', 'Attestation sportif'], ['attestationRqthPath', 'Attestation RQTH'], ['ancienCerfaPath', 'Ancien CERFA']] as [key, label]}
						{@const present = !!ficheEtu[key as keyof typeof ficheEtu]}
						{#if present}
							<a class="cs-fiche__doc cs-fiche__doc--ok" href={`/files/fiche/${candidat.id}/${key}`} target="_blank" rel="noopener">
								📎 {label}
							</a>
						{:else}
							<span class="cs-fiche__doc cs-fiche__doc--off">⬜ {label}</span>
						{/if}
					{/each}
				</div>
			{:else}
				<p class="cs-pl__note">
					Aucune fiche d'informations reçue. Cliquez sur « Compléter » pour la remplir
					manuellement.
				</p>
			{/if}
		</Card>
		<br>
	{/snippet}

	<!-- ───────── Entreprise ───────── -->
	{#if activeTab === 'entreprise'}
		{#if lastPlacement}
			<Card padding="18px">
				<div class="cs-syn__card-head">
					<span class="cs-syn__card-title">🏢 {lastPlacement.entreprise ?? 'Entreprise'}</span>
					<div class="cs-fiche__head-actions">
						{#if lastPlacement.typeContrat}
							<Badge
								label={lastPlacement.typeContrat === 'apprentissage'
									? 'Apprentissage'
									: 'Professionnalisation'}
								color={C.blueLight}
								textColor={C.blue}
							/>
						{/if}
						{#if editEnt}
							<Button size="sm" variant="subtle" onclick={() => (editEnt = false)}>Annuler</Button>
							<Button size="sm" onclick={saveEnt} disabled={savingEnt}>
								{savingEnt ? 'Enregistrement…' : 'Enregistrer'}
							</Button>
						{:else}
							<Button size="sm" variant="subtle" icon="✏️" onclick={startEditEnt}>
								{ficheEnt ? 'Modifier' : 'Compléter'}
							</Button>
						{/if}
					</div>
				</div>
				<div class="cs-pl__grid">
					<div><span>Contact</span>{`${lastPlacement.contactPrenom ?? ''} ${lastPlacement.contactNom ?? ''}`.trim() || '—'}</div>
					<div><span>Email</span>{lastPlacement.contactEmail ?? '—'}</div>
					<div><span>Téléphone</span>{lastPlacement.contactTel ?? '—'}</div>
					<div><span>Statut OPCO</span>{OPCO_LABELS[lastPlacement.statutOpco] ?? lastPlacement.statutOpco}</div>
				</div>

				{#if editEnt}
					<p class="cs-fiche__sub">Entreprise</p>
					<div class="cs-fedit__grid">
						{@render fSelect(entDraft, 'Type de contrat', 'typeContrat', CONTRAT_OPTS)}
						{@render fText(entDraft, 'Raison sociale', 'raisonSociale')}
						{@render fText(entDraft, 'Adresse siège', 'adresseSiege')}
						{@render fText(entDraft, "Adresse d'exécution", 'adresseExecution')}
						{@render fText(entDraft, 'SIRET siège', 'siretSiege', 'text', 14, true)}
						{@render fText(entDraft, 'SIRET exécution', 'siretExecution', 'text', 14, true)}
						{@render fText(entDraft, 'Forme juridique', 'formeJuridique')}
						{@render fText(entDraft, 'Type employeur', 'typeEmployeur')}
						{@render fText(entDraft, 'Code APE/NAF', 'codeApeNaf', 'text', 5)}
						{@render fText(entDraft, 'Code IDCC', 'codeIdcc', 'text', 4, true)}
						{@render fText(entDraft, 'Nb salariés', 'nbSalaries', 'number')}
						{@render fSelect(entDraft, 'OPCO', 'opco', OPCO_ORGANISMES.map((o) => [o, o]))}
						{@render fText(entDraft, 'Caisse retraite', 'caisseRetraite')}
						{@render fText(entDraft, 'Prévoyance', 'prevoyance')}
						{@render fText(entDraft, 'Téléphone', 'tel', 'tel', 10, true)}
					</div>
					<div class="cs-fedit__checks">
						{@render fBool(entDraft, 'Mandat OPCO', 'mandatOpco')}
					</div>

					<p class="cs-fiche__sub">Contacts</p>
					<div class="cs-fedit__grid">
						{@render fText(entDraft, "Chef d'entreprise — nom", 'chefNom')}
						{@render fText(entDraft, 'Chef — email', 'chefMail', 'email')}
						{@render fText(entDraft, 'Chef — téléphone', 'chefTel', 'tel')}
						{@render fText(entDraft, 'Contact RH — nom', 'rhNom')}
						{@render fText(entDraft, 'RH — email', 'rhMail', 'email')}
						{@render fText(entDraft, 'RH — téléphone', 'rhTel', 'tel')}
						{@render fText(entDraft, 'Facturation — adresse', 'factuAdresse')}
						{@render fText(entDraft, 'Facturation — email', 'factuMail', 'email')}
					</div>

					<p class="cs-fiche__sub">Tuteur</p>
					<div class="cs-fedit__grid">
						{@render fText(entDraft, 'Nom', 'tuteurNom')}
						{@render fText(entDraft, 'Prénom', 'tuteurPrenom')}
						{@render fText(entDraft, 'Fonction', 'tuteurFonction')}
						{@render fText(entDraft, 'Email', 'tuteurMail', 'email')}
						{@render fText(entDraft, 'Téléphone', 'tuteurTel', 'tel', 10, true)}
						{@render fText(entDraft, 'Date de naissance', 'tuteurDateNaissance', 'date')}
						{@render fText(entDraft, 'Expérience (années)', 'tuteurExperience', 'number')}
						{@render fText(entDraft, 'Diplôme le plus élevé', 'tuteurDiplome')}
						{@render fText(entDraft, 'Nb alternants tutorés', 'tuteurNbAlternants', 'number')}
					</div>

					<p class="cs-fiche__sub">Contrat</p>
					<div class="cs-fedit__grid">
						{@render fText(entDraft, 'Salaire brut mensuel', 'salaireBrut', 'text', undefined, true)}
						{@render fText(entDraft, 'SMIC / SMC', 'smicSmc')}
						{@render fText(entDraft, 'Date de début', 'dateDebut', 'date')}
					</div>
				{:else if ficheEnt}
					<p class="cs-fiche__sub">Entreprise {#if ficheEnt.submittedAt}<span class="cs-fiche__ok">· fiche reçue ✓</span>{/if}</p>
					<div class="cs-pl__grid">
						<div><span>Raison sociale</span>{ficheEnt.raisonSociale ?? '—'}</div>
						<div><span>Adresse siège</span>{ficheEnt.adresseSiege ?? '—'}</div>
						<div><span>Adresse d'exécution</span>{ficheEnt.adresseExecution ?? '—'}</div>
						<div><span>SIRET siège</span>{ficheEnt.siretSiege ?? '—'}</div>
						<div><span>SIRET exécution</span>{ficheEnt.siretExecution ?? '—'}</div>
						<div><span>Forme juridique</span>{ficheEnt.formeJuridique ?? '—'}</div>
						<div><span>Type employeur</span>{ficheEnt.typeEmployeur ?? '—'}</div>
						<div><span>Code APE/NAF</span>{ficheEnt.codeApeNaf ?? '—'}</div>
						<div><span>Code IDCC</span>{ficheEnt.codeIdcc ?? '—'}</div>
						<div><span>Nb salariés</span>{ficheEnt.nbSalaries ?? '—'}</div>
						<div><span>OPCO</span>{ficheEnt.opco ?? '—'}</div>
						<div><span>Mandat OPCO</span>{ficheEnt.mandatOpco ? 'Oui' : 'Non'}</div>
						<div><span>Caisse retraite</span>{ficheEnt.caisseRetraite ?? '—'}</div>
						<div><span>Prévoyance</span>{ficheEnt.prevoyance ?? '—'}</div>
						<div><span>Téléphone</span>{ficheEnt.tel ?? '—'}</div>
					</div>

					<p class="cs-fiche__sub">Contacts</p>
					<div class="cs-pl__grid">
						<div><span>Chef d'entreprise</span>{`${ficheEnt.chefNom ?? ''}`.trim() || '—'}</div>
						<div><span>Chef — mail / tél</span>{`${ficheEnt.chefMail ?? '—'} · ${ficheEnt.chefTel ?? '—'}`}</div>
						<div><span>Contact RH</span>{ficheEnt.rhNom ?? '—'}</div>
						<div><span>RH — mail / tél</span>{`${ficheEnt.rhMail ?? '—'} · ${ficheEnt.rhTel ?? '—'}`}</div>
						<div><span>Facturation — adresse</span>{ficheEnt.factuAdresse ?? '—'}</div>
						<div><span>Facturation — mail</span>{ficheEnt.factuMail ?? '—'}</div>
					</div>

					<p class="cs-fiche__sub">Tuteur</p>
					<div class="cs-pl__grid">
						<div><span>Nom / Prénom</span>{`${ficheEnt.tuteurPrenom ?? ''} ${ficheEnt.tuteurNom ?? ''}`.trim() || '—'}</div>
						<div><span>Fonction</span>{ficheEnt.tuteurFonction ?? '—'}</div>
						<div><span>Mail / Tél</span>{`${ficheEnt.tuteurMail ?? '—'} · ${ficheEnt.tuteurTel ?? '—'}`}</div>
						<div><span>Date de naissance</span>{ficheEnt.tuteurDateNaissance ?? '—'}</div>
						<div><span>Expérience</span>{ficheEnt.tuteurExperience != null ? `${ficheEnt.tuteurExperience} an(s)` : '—'}</div>
						<div><span>Diplôme le plus élevé</span>{ficheEnt.tuteurDiplome ?? '—'}</div>
						<div><span>Nb alternants tutorés</span>{ficheEnt.tuteurNbAlternants ?? '—'}</div>
					</div>

					<p class="cs-fiche__sub">Contrat</p>
					<div class="cs-pl__grid">
						<div><span>Type</span>{ficheEnt.typeContrat === 'apprentissage' ? 'Apprentissage' : ficheEnt.typeContrat === 'professionnalisation' ? 'Professionnalisation' : '—'}</div>
						<div><span>Salaire brut mensuel</span>{ficheEnt.salaireBrut ?? '—'}</div>
						<div><span>SMIC / SMC</span>{ficheEnt.smicSmc ?? '—'}</div>
						<div><span>Date de début</span>{ficheEnt.dateDebut ?? '—'}</div>
					</div>
				{:else}
					<p class="cs-pl__note">
						La fiche entreprise complète (SIRET, tuteur, contrat…) n'a pas encore été
						renvoyée par l'entreprise via son lien tokenisé.
					</p>
				{/if}
			</Card>
		{:else}
			<Card padding="24px">
				<div class="cs-tab-soon">
					<span class="cs-tab-soon__icon">🏢</span>
					<p class="cs-tab-soon__title">Aucune entreprise rattachée</p>
					<p class="cs-tab-soon__sub">
						Placez l'étudiant en entreprise depuis l'onglet <strong>École</strong> pour envoyer
						la fiche de renseignements à l'entreprise.
					</p>
				</div>
			</Card>
		{/if}
	{/if}

	<!-- ───────── École ───────── -->
	{#if activeTab === 'ecole'}
		<Card padding="18px">
			<div class="cs-syn__card-head">
				<span class="cs-syn__card-title">🏫 Placements & suivi</span>
				<Button size="sm" icon="＋" onclick={openPassation}>Passer en entreprise</Button>
			</div>
			{#if placements.length === 0}
				<div class="cs-tab-soon">
					<span class="cs-tab-soon__icon">🏫</span>
					<p class="cs-tab-soon__title">Aucun placement</p>
					<p class="cs-tab-soon__sub">
						Remplissez la fiche de passation pour placer l'étudiant en entreprise. Un lien
						tokenisé sera envoyé à l'étudiant (fiche d'informations) et à l'entreprise (fiche
						de renseignements).
					</p>
				</div>
			{:else}
				<div class="cs-pl__list">
					{#each placements as p (p.id)}
						{@const pc = opcoColor(p.statutOpco)}
						<div class="cs-pl__item">
							<div class="cs-pl__item-head">
								<span class="cs-pl__ent">{p.entreprise ?? 'Entreprise'}</span>
								<label class="cs-pl__opco">
									<span>Statut OPCO</span>
									<select
										class="cs-pl__opco-select"
										style:background={pc.bg}
										style:color={pc.fg}
										style:border-color={pc.border}
										value={p.statutOpco}
										onchange={(e) => changeStatutOpco(p.id, e.currentTarget.value)}
									>
										{#each Object.entries(OPCO_LABELS) as [value, label]}
											<option {value}>{label}</option>
										{/each}
									</select>
								</label>
							</div>
							<div class="cs-pl__grid">
								<div><span>Promo</span>{p.promo ?? '—'}</div>
								<div><span>Source</span>{p.source ?? '—'}</div>
								<div><span>Suivi par</span>{p.suiviPar ?? '—'}</div>
								<div><span>Date placement</span>{p.datePlacement ?? '—'}</div>
								<div><span>Contact</span>{`${p.contactPrenom ?? ''} ${p.contactNom ?? ''}`.trim() || '—'}</div>
								<div><span>Email entreprise</span>{p.contactEmail ?? '—'}</div>
							</div>
							<!-- Suivi des liens : réception et relances automatiques (72 h). -->
							<div class="cs-pl__liens">
								{#each data.relances[p.id] ?? [] as l (l.audience)}
									<span class="cs-pl__lien">
										<strong>{l.audience === 'etudiant' ? 'Fiche étudiant' : 'Fiche entreprise'}</strong>
										{#if l.submittedAt}
											<span class="cs-pl__lien-ok">reçue le {fmtDate(l.submittedAt)}</span>
										{:else}
											<span class="cs-pl__lien-wait">en attente</span>
											{#if l.relanceCount > 0}
												· {l.relanceCount} relance{l.relanceCount > 1 ? 's' : ''} (dernière le
												{fmtDate(l.lastRelanceAt)})
											{/if}
											{#if l.nextRelanceAt}
												· prochaine relance le {fmtDate(l.nextRelanceAt)}
											{:else}
												· relances épuisées
											{/if}
										{/if}
									</span>
								{/each}
							</div>
							<div class="cs-pl__item-actions">
								<span class="cs-pl__flow">Dossier : {p.statut.replace('_', ' ')}</span>
								<Button size="sm" variant="subtle" onclick={() => resendLinks(p.id)}>
									Renvoyer les liens
								</Button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</Card>
	{/if}
</div>

<!-- ───────── Modal passation ───────── -->
<Modal
	open={passOpen}
	onclose={() => (passOpen = false)}
	title={`Passer ${candidat.name} en entreprise`}
	width={620}
>
	<form class="cs-pass" onsubmit={submitPassation}>
		<p class="cs-pass__lead">
			À la validation, un lien tokenisé est envoyé à l'étudiant (fiche d'informations) et à
			l'entreprise (fiche de renseignements). Les infos déjà connues ne sont pas redemandées.
		</p>

		<div class="cs-pass__row">
			<div class="cs-field">
				<label class="cs-pass__lab" for="pass-promo">Promo<span class="cs-pass__req">*</span></label>
				<select id="pass-promo" class="cs-pass__select" bind:value={pPromo} required>
					<option value="" disabled>— Choisir —</option>
					{#each data.promos as pr}
						<option value={String(pr.id)}>{pr.label}</option>
					{/each}
				</select>
			</div>
			<div class="cs-field">
				<label class="cs-pass__lab" for="pass-source">Source<span class="cs-pass__req">*</span></label>
				<select id="pass-source" class="cs-pass__select" bind:value={pSource} required>
					<option value="" disabled>— Choisir —</option>
					<option value="Solo">Solo</option>
					{#if data.currentUserName}<option value={data.currentUserName}>{data.currentUserName}</option>{/if}
				</select>
			</div>
		</div>
		<div class="cs-pass__row">
			<div class="cs-field">
				<label class="cs-pass__lab" for="pass-suivi">Suivi par<span class="cs-pass__req">*</span></label>
				<select id="pass-suivi" class="cs-pass__select" bind:value={pSuiviPar} required>
					<option value="" disabled>— Choisir —</option>
					{#each data.staff as s}
						<option value={s.name}>{s.name}</option>
					{/each}
				</select>
			</div>
			<Input label="Date de placement" name="datePlacement" type="date" bind:value={pDate} required />
		</div>

		<p class="cs-pass__section">Entreprise</p>
		<div class="cs-pass__row">
			<Input label="Entreprise" name="entreprise" bind:value={pEntreprise} placeholder="Raison sociale" required />
			<div class="cs-field">
				<label class="cs-pass__lab" for="pass-contrat">Type de contrat<span class="cs-pass__req">*</span></label>
				<select id="pass-contrat" class="cs-pass__select" bind:value={pTypeContrat} required>
					<option value="" disabled>— Choisir —</option>
					<option value="apprentissage">Apprentissage</option>
					<option value="professionnalisation">Professionnalisation</option>
				</select>
			</div>
		</div>
		<div class="cs-pass__row">
			<Input label="Contact — Nom" name="contactNom" bind:value={pContactNom} required />
			<Input label="Contact — Prénom" name="contactPrenom" bind:value={pContactPrenom} required />
		</div>
		<div class="cs-pass__row">
			<Input label="Téléphone" name="contactTel" type="tel" bind:value={pContactTel} digitsOnly inputmode="numeric" maxlength={10} required />
			<Input
				label="Email entreprise (lien fiche)"
				name="contactEmail"
				type="email"
				bind:value={pContactEmail}
				placeholder="contact@entreprise.fr"
				required
			/>
		</div>

		<div class="cs-pass__row">
			<div class="cs-field">
				<label class="cs-pass__lab" for="pass-opco">Statut OPCO</label>
				<select id="pass-opco" class="cs-pass__select" bind:value={pStatutOpco}>
					{#each Object.entries(OPCO_LABELS) as [value, label]}
						<option {value}>{label}</option>
					{/each}
				</select>
			</div>
			<div></div>
		</div>

		{#if passError}<div class="cs-pass__err">⚠ {passError}</div>{/if}

		<div class="cs-pass__actions">
			<Button variant="ghost" type="button" onclick={() => (passOpen = false)}>Annuler</Button>
			<Button variant="primary" type="submit" disabled={passLoading}>
				{passLoading ? 'Envoi…' : 'Créer & envoyer les liens'}
			</Button>
		</div>
	</form>
</Modal>

<style>
	.cs-detail-page {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.cs-detail-page__bar {
		margin: 0 auto;
		width: 100%;
	}
	.cs-detail-page__back {
		font-size: 13px;
		font-weight: 600;
		color: var(--c-blue);
	}
	.cs-detail-page__back:hover {
		text-decoration: underline;
	}
	.cs-detail-page__actions {
		margin-top: 1rem;
		display: flex;
		gap: 10px;
	}

	/* ───────── Onglets ───────── */
	.cs-etu__tabs {
		display: flex;
		gap: 4px;
		border-bottom: 1.5px solid var(--c-border);
		overflow-x: auto;
	}
	.cs-etu__tab {
		padding: 10px 18px;
		border: none;
		background: none;
		color: var(--c-muted);
		font-size: 14px;
		font-weight: 600;
		font-family: var(--font-body);
		cursor: pointer;
		border-bottom: 2px solid transparent;
		margin-bottom: -1.5px;
		white-space: nowrap;
	}
	.cs-etu__tab:hover {
		color: var(--c-blue);
	}
	.cs-etu__tab--active {
		color: var(--c-blue);
		border-bottom-color: var(--c-blue);
	}

	/* ───────── Synthèse ───────── */
	.cs-syn {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 14px;
		/* stretch (défaut) : toutes les cartes d'une ligne prennent la hauteur de
		   la plus haute, plutôt que de s'ajuster à leur contenu. */
		align-items: stretch;
	}
	.cs-syn__card-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		margin-bottom: 14px;
	}
	.cs-syn__card-title {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 15px;
		color: var(--c-text);
	}
	.cs-syn__link {
		border: none;
		background: none;
		font-size: 12px;
		font-weight: 600;
		color: var(--c-blue);
		cursor: pointer;
		font-family: var(--font-body);
	}
	.cs-syn__link:hover {
		text-decoration: underline;
	}
	.cs-syn__student {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 12px;
	}
	.cs-syn__avatar {
		width: 44px;
		height: 44px;
		border-radius: 12px;
		background: var(--c-blue-light);
		display: grid;
		place-items: center;
		font-weight: 800;
		color: var(--c-blue);
		font-size: 14px;
		flex-shrink: 0;
	}
	.cs-syn__student-info {
		flex: 1;
		min-width: 0;
	}
	.cs-syn__name {
		font-weight: 700;
		font-size: 14px;
		color: var(--c-text);
	}
	.cs-syn__muted {
		font-size: 12px;
		color: var(--c-muted);
		margin-top: 2px;
	}
	.cs-syn__score {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 20px;
		flex-shrink: 0;
	}
	.cs-syn__score small {
		font-size: 11px;
		color: var(--c-muted);
	}
	.cs-syn__flags {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-bottom: 12px;
	}
	.cs-syn__contact {
		display: flex;
		flex-wrap: wrap;
		gap: 6px 14px;
		font-size: 12px;
		color: var(--c-sub);
	}
	.cs-syn__placeholder {
		padding: 10px 0;
	}
	.cs-syn__ph-title {
		font-size: 13px;
		font-weight: 600;
		color: var(--c-sub);
		margin-bottom: 4px;
	}
	.cs-syn__progress {
		margin-bottom: 14px;
	}
	.cs-syn__progress-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 6px;
	}
	.cs-syn__progress-count {
		font-size: 12px;
		font-weight: 700;
		color: var(--c-blue);
	}
	.cs-syn__bar {
		height: 6px;
		border-radius: 99px;
		background: var(--c-border);
		overflow: hidden;
	}
	.cs-syn__bar-fill {
		height: 100%;
		border-radius: 99px;
		background: var(--c-blue);
		transition: width 0.3s;
	}
	.cs-syn__checklist {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.cs-syn__check {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		color: var(--c-sub);
	}
	.cs-syn__check--done {
		color: var(--c-text);
		font-weight: 600;
	}
	.cs-syn__check--toggle {
		cursor: pointer;
	}
	.cs-syn__check--sub {
		padding-left: 14px;
	}
	.cs-syn__check-box {
		flex-shrink: 0;
		width: 16px;
		height: 16px;
		accent-color: var(--c-blue);
		cursor: pointer;
	}
	.cs-syn__check-group {
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.4px;
		color: var(--c-muted);
		margin-top: 4px;
	}

	/* ───────── Onglets « à venir » ───────── */
	.cs-tab-soon {
		max-width: 460px;
		margin: 0 auto;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 20px 0;
	}
	.cs-tab-soon__icon {
		font-size: 34px;
	}
	.cs-tab-soon__title {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 16px;
		color: var(--c-text);
	}
	.cs-tab-soon__sub {
		font-size: 13px;
		color: var(--c-muted);
		line-height: 1.5;
	}

	/* ───────── Placements / École ───────── */
	.cs-pl__grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 10px 16px;
		margin-bottom: 10px;
	}
	.cs-pl__grid > div {
		display: flex;
		flex-direction: column;
		font-size: 13px;
		color: var(--c-text);
		min-width: 0;
		word-break: break-word;
	}
	.cs-pl__grid span {
		font-size: 11px;
		font-weight: 600;
		color: var(--c-muted);
		text-transform: uppercase;
		letter-spacing: 0.3px;
		margin-bottom: 2px;
	}
	.cs-pl__note {
		font-size: 12px;
		color: var(--c-muted);
		line-height: 1.5;
	}
	.cs-pl__list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.cs-pl__item {
		border: 1px solid var(--c-border);
		border-radius: 12px;
		padding: 14px;
		background: var(--c-bg);
	}
	.cs-pl__item-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		margin-bottom: 10px;
		flex-wrap: wrap;
	}
	.cs-pl__ent {
		font-weight: 700;
		font-size: 14px;
		color: var(--c-text);
	}
	.cs-pl__opco {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.cs-pl__opco > span {
		font-size: 11px;
		font-weight: 600;
		color: var(--c-muted);
		text-transform: uppercase;
		letter-spacing: 0.3px;
	}
	.cs-pl__opco-select,
	.cs-syn__opco-select {
		padding: 5px 8px;
		border-radius: 7px;
		border: 1.5px solid var(--c-blue);
		background: var(--c-card);
		color: var(--c-blue);
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
		font-family: var(--font-body);
		outline: none;
	}
	.cs-syn__ent {
		margin-bottom: 12px;
	}
	.cs-syn__opco {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.cs-syn__opco label,
	.cs-syn__opco > .cs-syn__muted {
		text-transform: uppercase;
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.3px;
	}
	.cs-syn__opco-select {
		align-self: flex-start;
	}
	.cs-syn__opco + .cs-syn__opco {
		margin-top: 12px;
	}
	.cs-syn__contact-block {
		margin-bottom: 14px;
	}
	.cs-syn__contact-lab {
		text-transform: uppercase;
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.3px;
		color: var(--c-muted);
		margin-bottom: 4px;
	}
	.cs-syn__contact-name {
		font-size: 13px;
		font-weight: 600;
		color: var(--c-text);
		margin-bottom: 4px;
	}
	.cs-syn__contact a {
		color: inherit;
		text-decoration: none;
	}
	.cs-syn__contact a:hover {
		text-decoration: underline;
	}
	.cs-pl__item-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		flex-wrap: wrap;
	}
	.cs-pl__flow {
		font-size: 12px;
		color: var(--c-muted);
		text-transform: capitalize;
	}
	.cs-pl__liens {
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin: 10px 0 4px;
	}
	.cs-pl__lien {
		font-size: 12px;
		color: var(--c-muted);
	}
	.cs-pl__lien strong {
		color: var(--c-sub);
		font-weight: 600;
		margin-right: 4px;
	}
	.cs-pl__lien-ok {
		color: var(--c-green);
		font-weight: 600;
	}
	.cs-pl__lien-wait {
		color: var(--c-orange);
		font-weight: 600;
	}

	/* ───────── Fiches soumises (lecture seule) ───────── */
	:global(.cs-fiche-card) {
		margin-top: 14px;
	}
	.cs-fiche__sub {
		font-size: 12px;
		font-weight: 700;
		color: var(--c-sub);
		text-transform: uppercase;
		letter-spacing: 0.4px;
		margin: 14px 0 8px;
		padding-top: 12px;
		border-top: 1px solid var(--c-border);
	}
	.cs-fiche__ok {
		color: var(--c-green);
		font-weight: 600;
		text-transform: none;
		letter-spacing: 0;
	}
	.cs-fiche__flags {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 10px;
	}
	.cs-fiche__docs {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.cs-fiche__doc {
		font-size: 12px;
		font-weight: 600;
		padding: 6px 10px;
		border-radius: 8px;
		border: 1.5px solid var(--c-border);
		text-decoration: none;
	}
	.cs-fiche__doc--ok {
		color: var(--c-blue);
		border-color: var(--c-blue);
		background: var(--c-blue-soft);
	}
	.cs-fiche__doc--ok:hover {
		text-decoration: underline;
	}
	.cs-fiche__doc--off {
		color: var(--c-muted);
		opacity: 0.7;
	}
	.cs-fiche__head-actions {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	/* ───────── Note de suivi ───────── */
	/* La carte étant étirée à la hauteur de la ligne, le champ occupe la place
	   restante plutôt que de laisser un vide sous lui. */
	:global(.cs-syn__note-card) {
		display: flex;
		flex-direction: column;
	}
	.cs-note__inp {
		flex: 1;
		min-height: 90px;
		width: 100%;
		padding: 10px 12px;
		border: 1.5px solid var(--c-border);
		border-radius: 9px;
		background: var(--c-card);
		color: var(--c-text);
		font-size: 13px;
		font-family: var(--font-body);
		line-height: 1.6;
		resize: vertical;
		outline: none;
	}
	.cs-note__inp:focus {
		border-color: var(--c-blue);
	}
	.cs-note__inp[readonly] {
		background: var(--c-bg);
		color: var(--c-sub);
	}
	.cs-note__foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		flex-wrap: wrap;
		margin-top: 10px;
	}

	/* ───────── Suggestion de salaire ───────── */
	.cs-sal {
		border: 1px solid var(--c-border);
		border-radius: 10px;
		background: var(--c-bg);
		padding: 12px 14px;
		margin-bottom: 14px;
	}
	.cs-sal__head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 10px;
		flex-wrap: wrap;
		margin-bottom: 10px;
	}
	.cs-sal__title {
		font-size: 13px;
		font-weight: 700;
		color: var(--c-text);
	}
	.cs-sal__meta {
		font-size: 12px;
		color: var(--c-muted);
	}
	.cs-sal__rows {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 8px;
	}
	.cs-sal__row {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 8px 10px;
		border-radius: 8px;
		background: var(--c-card);
		border: 1px solid var(--c-border);
	}
	.cs-sal__annee {
		font-size: 11px;
		color: var(--c-muted);
		text-transform: uppercase;
		letter-spacing: 0.3px;
	}
	.cs-sal__montant {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 17px;
		color: var(--c-blue);
	}
	.cs-sal__pct {
		font-size: 11px;
		color: var(--c-sub);
	}
	.cs-sal__note {
		font-size: 11px;
		color: var(--c-muted);
		margin-top: 8px;
		line-height: 1.5;
	}

	/* ───────── Édition des fiches ───────── */
	.cs-fedit__grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 10px 16px;
		margin-bottom: 12px;
	}
	.cs-fedit__lbl {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 11px;
		font-weight: 600;
		color: var(--c-muted);
		text-transform: uppercase;
		letter-spacing: 0.3px;
	}
	.cs-fedit__inp {
		padding: 8px 10px;
		border-radius: 8px;
		border: 1.5px solid var(--c-border);
		font-size: 13px;
		font-weight: 400;
		text-transform: none;
		letter-spacing: 0;
		background: var(--c-card);
		color: var(--c-text);
		outline: none;
		font-family: var(--font-body);
	}
	.cs-fedit__inp:focus {
		border-color: var(--c-blue);
	}
	.cs-fedit__checks {
		display: flex;
		flex-wrap: wrap;
		gap: 14px;
		margin-bottom: 12px;
		font-size: 13px;
		color: var(--c-sub);
	}
	.cs-fedit__check {
		display: flex;
		align-items: center;
		gap: 6px;
		cursor: pointer;
	}

	/* ───────── Formulaire de passation ───────── */
	.cs-pass {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.cs-pass__lead {
		font-size: 13px;
		color: var(--c-muted);
		line-height: 1.5;
	}
	.cs-pass__section {
		font-size: 12px;
		font-weight: 700;
		color: var(--c-sub);
		text-transform: uppercase;
		letter-spacing: 0.4px;
		margin-top: 6px;
	}
	.cs-pass__row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}
	.cs-pass__lab {
		font-size: 13px;
		font-weight: 600;
		color: var(--c-sub);
		display: block;
		margin-bottom: 5px;
	}
	.cs-pass__req {
		color: var(--c-red);
		margin-left: 3px;
	}
	.cs-pass__select {
		width: 100%;
		padding: 10px 14px;
		border-radius: 9px;
		border: 1.5px solid var(--c-border);
		background: var(--c-card);
		color: var(--c-text);
		font-family: var(--font-body);
		font-size: 14px;
		outline: none;
	}
	.cs-pass__select:focus {
		border-color: var(--c-blue);
	}
	.cs-pass__err {
		background: var(--c-red-light);
		color: var(--c-red);
		font-size: 13px;
		padding: 10px 14px;
		border-radius: 8px;
	}
	.cs-pass__actions {
		display: flex;
		gap: 10px;
		justify-content: flex-end;
		margin-top: 8px;
	}
	@media (max-width: 540px) {
		.cs-pass__row {
			grid-template-columns: 1fr;
		}
	}
	@media (max-width: 640px) {
		.cs-detail-page__actions {
			flex-direction: column;
		}
	}
</style>
