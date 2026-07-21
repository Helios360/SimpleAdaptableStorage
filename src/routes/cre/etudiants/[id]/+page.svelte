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
	import { OPCO_LABELS, situationLabel, diplomeLabel } from '$lib/placementLogic';
	import {
		checklistItemsForSchool,
		checklistProgress,
		type ChecklistState,
		type SchoolType
	} from '$lib/checklist';
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
		fd.set('promo', pPromo);
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
</script>

<svelte:head>
	<title>{candidat.name} · Étudiant</title>
</svelte:head>

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
					<div class="cs-syn__opco">
						<label class="cs-syn__muted" for="syn-opco">Statut OPCO</label>
						<select
							id="syn-opco"
							class="cs-syn__opco-select"
							value={lastPlacement.statutOpco}
							onchange={(e) => changeStatutOpco(lastPlacement.id, e.currentTarget.value)}
						>
							{#each Object.entries(OPCO_LABELS) as [value, label]}
								<option {value}>{label}</option>
							{/each}
						</select>
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

		{#if ficheEtu}
			<Card padding="18px" class="cs-fiche-card">
				<div class="cs-syn__card-head">
					<span class="cs-syn__card-title">📋 Fiche d'informations</span>
					{#if ficheEtu.submittedAt}<Badge label="Reçue" color={C.greenLight} textColor={C.green} />{/if}
				</div>
				<div class="cs-pl__grid">
					<div><span>Nom de naissance</span>{ficheEtu.nomNaissance ?? '—'}</div>
					<div><span>Civilité</span>{ficheEtu.civilite ?? '—'}</div>
					<div><span>Naissance</span>{`${ficheEtu.communeNaissance ?? ''} ${ficheEtu.cpNaissance ?? ''} ${ficheEtu.paysNaissance ?? ''}`.trim() || '—'}</div>
					<div><span>Adresse</span>{ficheEtu.adresseRue ?? '—'}</div>
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
			</Card>
		{/if}
	{/if}

	<!-- ───────── Entreprise ───────── -->
	{#if activeTab === 'entreprise'}
		{#if lastPlacement}
			<Card padding="18px">
				<div class="cs-syn__card-head">
					<span class="cs-syn__card-title">🏢 {lastPlacement.entreprise ?? 'Entreprise'}</span>
					{#if lastPlacement.typeContrat}
						<Badge
							label={lastPlacement.typeContrat === 'apprentissage'
								? 'Apprentissage'
								: 'Professionnalisation'}
							color={C.blueLight}
							textColor={C.blue}
						/>
					{/if}
				</div>
				<div class="cs-pl__grid">
					<div><span>Contact</span>{`${lastPlacement.contactPrenom ?? ''} ${lastPlacement.contactNom ?? ''}`.trim() || '—'}</div>
					<div><span>Email</span>{lastPlacement.contactEmail ?? '—'}</div>
					<div><span>Téléphone</span>{lastPlacement.contactTel ?? '—'}</div>
					<div><span>Statut OPCO</span>{OPCO_LABELS[lastPlacement.statutOpco] ?? lastPlacement.statutOpco}</div>
				</div>

				{#if ficheEnt}
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
						<div class="cs-pl__item">
							<div class="cs-pl__item-head">
								<span class="cs-pl__ent">{p.entreprise ?? 'Entreprise'}</span>
								<label class="cs-pl__opco">
									<span>Statut OPCO</span>
									<select
										class="cs-pl__opco-select"
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
						<option value={pr.label}>{pr.label}</option>
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
			<Input label="Téléphone" name="contactTel" type="tel" bind:value={pContactTel} required />
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
		align-items: start;
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
