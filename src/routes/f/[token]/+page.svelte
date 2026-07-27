<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import Input from '$lib/components/Input.svelte';
	import FileUpload from '$lib/components/FileUpload.svelte';
	import { pushToast } from '$lib/stores/toast.svelte';
	import { SITUATIONS, DIPLOMES, OPCO_ORGANISMES } from '$lib/placementLogic';
	import { ageFromBirth } from '$lib/utils';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let saving = $state(false);
	let done = $state(false);
	let errorMsg = $state<string | null>(null);

	// Âge de l'étudiant : si majeur, on n'affiche pas les infos du représentant légal.
	const age = data.audience === 'etudiant' ? ageFromBirth(data.known.naissance) : null;
	const mineur = age != null && age < 18;

	// Champs conditionnels (réactifs sur les cases à cocher).
	let sportif = $state(data.audience === 'etudiant' ? (data.fiche?.sportifHautNiveau ?? false) : false);
	let rqth = $state(data.audience === 'etudiant' ? (data.fiche?.rqth ?? false) : false);
	let dejaAlternance = $state(data.audience === 'etudiant' ? (data.fiche?.dejaAlternance ?? false) : false);
	let majeur = $state(data.audience === 'etudiant' ? (data.fiche?.majeur ?? !mineur) : true);

	async function submit(e: SubmitEvent, action: string) {
		e.preventDefault();
		errorMsg = null;
		const formEl = e.currentTarget as HTMLFormElement;
		const fd = new FormData(formEl);
		saving = true;
		try {
			const res = await fetch(`?/${action}`, { method: 'POST', body: fd });
			const json = await res.json().catch(() => null);
			const parsed = json?.data ? JSON.parse(json.data) : null;
			const payload = Array.isArray(parsed) ? parsed[0] : parsed;
			if (json?.type === 'failure' || (json?.status ?? 200) >= 400) {
				errorMsg = payload?.error ?? "Erreur lors de l'envoi.";
				return;
			}
			done = true;
			pushToast('Fiche enregistrée ✓', 'success');
		} catch {
			errorMsg = 'Erreur réseau.';
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head><title>Formulaire · dossier alternance</title></svelte:head>

<div class="cs-pub">
	<div class="cs-pub__card">
		{#if !data.valid}
			<div class="cs-pub__state">
				<span class="cs-pub__state-icon">⛔</span>
				<h1>Lien invalide ou expiré</h1>
				<p>Ce lien n'est plus valable. Rapprochez-vous de votre référent pour en obtenir un nouveau.</p>
			</div>
		{:else if done}
			<div class="cs-pub__state">
				<span class="cs-pub__state-icon">✅</span>
				<h1>Merci !</h1>
				<p>Votre fiche a bien été enregistrée. Vous pouvez fermer cette page.</p>
			</div>
		{:else if data.audience === 'etudiant'}
			{@const k = data.known}
			{@const f = data.fiche}
			<header class="cs-pub__head">
				<h1>Fiche d'informations</h1>
				<p>Merci de compléter les informations ci-dessous pour finaliser votre dossier.</p>
				{#if data.submitted}<p class="cs-pub__note">Vous avez déjà envoyé cette fiche — vous pouvez la corriger et la renvoyer.</p>{/if}
			</header>

			<div class="cs-pub__known">
				<p class="cs-pub__known-title">Déjà connu</p>
				<div class="cs-pub__known-grid">
					<span>{k.prenom} {k.nom}</span>
					{#if k.formation}<span>{k.formation}</span>{/if}
					{#if k.ville}<span>📍 {k.ville}{#if k.cp} ({k.cp}){/if}</span>{/if}
					{#if k.tel}<span>📞 {k.tel}</span>{/if}
				</div>
			</div>

			<form class="cs-form" enctype="multipart/form-data" onsubmit={(e) => submit(e, 'submitEtudiant')}>
				<p class="cs-form__section">État civil</p>
				<div class="cs-form__row">
					<Input label="Nom de naissance" name="nomNaissance" value={f?.nomNaissance ?? ''} required />
					<Input label="Nom d'usage" name="nomUsage" value={f?.nomUsage ?? ''} hint="Si différent du nom de naissance" />
				</div>
				<div class="cs-form__row">
					<div class="cs-field">
						<label class="cs-label" for="civilite">Civilité<span class="cs-req">*</span></label>
						<select id="civilite" name="civilite" class="cs-select" required value={f?.civilite ?? ''}>
							<option value="">—</option>
							<option value="femme">Femme</option>
							<option value="homme">Homme</option>
							<option value="na">N/A</option>
						</select>
					</div>
					<Input label="Pays de naissance" name="paysNaissance" value={f?.paysNaissance ?? ''} required />
				</div>
				<div class="cs-form__row">
					<Input label="Commune de naissance" name="communeNaissance" value={f?.communeNaissance ?? ''} required />
					<Input label="Code postal de naissance" name="cpNaissance" value={f?.cpNaissance ?? ''} digitsOnly inputmode="numeric" maxlength={5} required />
				</div>
				<Input label="Adresse postale (numéro et voie)" name="adresseRue" value={f?.adresseRue ?? ''} required />
				<div class="cs-form__row">
					<Input label="Code postal" name="adresseCp" value={f?.adresseCp ?? ''} digitsOnly inputmode="numeric" maxlength={5} required />
					<Input label="Ville" name="adresseVille" value={f?.adresseVille ?? ''} required />
				</div>
				<div class="cs-form__row">
					<Input label="Numéro de sécurité sociale (NIR)" name="nir" value={f?.nir ?? ''} digitsOnly inputmode="numeric" maxlength={15} required />
					<div class="cs-field">
						<label class="cs-label" for="nationalite">Nationalité<span class="cs-req">*</span></label>
						<select id="nationalite" name="nationalite" class="cs-select" required value={f?.nationalite ?? ''}>
							<option value="">—</option>
							<option value="francaise">Française</option>
							<option value="ue">Union européenne</option>
							<option value="hors_ue">Étranger hors UE</option>
						</select>
					</div>
				</div>
				<label class="cs-check">
					<input type="checkbox" name="majeur" value="1" bind:checked={majeur} /> Je suis majeur(e)
				</label>

				{#if !majeur}
					<p class="cs-form__section">Représentant légal (si mineur)</p>
					<div class="cs-form__row">
						<Input label="Nom" name="repNom" value={f?.repNom ?? ''} required />
						<Input label="Prénom" name="repPrenom" value={f?.repPrenom ?? ''} required />
					</div>
					<div class="cs-form__row">
						<Input label="Email" name="repMail" type="email" value={f?.repMail ?? ''} required />
						<Input label="Téléphone" name="repTel" type="tel" value={f?.repTel ?? ''} digitsOnly inputmode="numeric" maxlength={10} required />
					</div>
					<Input label="Adresse postale" name="repAdresse" value={f?.repAdresse ?? ''} required />
				{/if}

				<p class="cs-form__section">Situation & diplômes</p>
				<div class="cs-form__checks">
					<label class="cs-check">
						<input type="checkbox" name="sportifHautNiveau" value="1" bind:checked={sportif} /> Sportif de haut niveau
					</label>
					<label class="cs-check">
						<input type="checkbox" name="rqth" value="1" bind:checked={rqth} /> Situation de handicap (RQTH)
					</label>
					<label class="cs-check">
						<input type="checkbox" name="dejaAlternance" value="1" bind:checked={dejaAlternance} /> Déjà fait de l'alternance
					</label>
				</div>
				<div class="cs-form__row">
					<div class="cs-field">
						<label class="cs-label" for="situation">Situation avant contrat</label>
						<select id="situation" name="situationAvantContrat" class="cs-select" value={f?.situationAvantContrat ?? ''}>
							<option value="">—</option>
							{#each SITUATIONS as [v, l]}<option value={v}>{v} — {l}</option>{/each}
						</select>
					</div>
					{#if dejaAlternance}
						<Input label="Numéro DECA (si ancien contrat)" name="numeroDeca" value={f?.numeroDeca ?? ''} />
					{/if}
				</div>
				<div class="cs-form__row">
					<div class="cs-field">
						<label class="cs-label" for="diplPrep">Dernier diplôme préparé</label>
						<select id="diplPrep" name="dernierDiplomePrepare" class="cs-select" value={f?.dernierDiplomePrepare ?? ''}>
							<option value="">—</option>
							{#each DIPLOMES as [v, l]}<option value={v}>{v} — {l}</option>{/each}
						</select>
					</div>
					<div class="cs-field">
						<label class="cs-label" for="diplEleve">Diplôme le plus élevé obtenu</label>
						<select id="diplEleve" name="diplomeLePlusEleve" class="cs-select" value={f?.diplomeLePlusEleve ?? ''}>
							<option value="">—</option>
							{#each DIPLOMES as [v, l]}<option value={v}>{v} — {l}</option>{/each}
						</select>
					</div>
				</div>
				<Input label="Intitulé précis du dernier diplôme préparé" name="intituleDiplomePrepare" value={f?.intituleDiplomePrepare ?? ''} />

				<p class="cs-form__section">Documents (PDF ou image, 8 Mo max)</p>
				<div class="cs-form__docs">
					<FileUpload label="Carte d'identité ou titre de séjour" name="titreSejour" accept=".pdf,.png,.jpg,.jpeg,.webp" maxSizeMB={8} hint={f?.titreSejourPath ? 'Déjà déposé — remplacer' : undefined} required />
					<FileUpload label="Carte vitale" name="carteVitale" accept=".pdf,.png,.jpg,.jpeg,.webp" maxSizeMB={8} hint={f?.carteVitalePath ? 'Déjà déposé — remplacer' : undefined} required />
					<FileUpload label="Dernier diplôme / relevé de notes" name="diplome" accept=".pdf,.png,.jpg,.jpeg,.webp" maxSizeMB={8} hint={f?.diplomePath ? 'Déjà déposé — remplacer' : undefined} required />
					<FileUpload label="Photo d'identité" name="photoId" accept=".pdf,.png,.jpg,.jpeg,.webp" maxSizeMB={8} hint={f?.photoIdPath ? 'Déjà déposé — remplacer' : undefined} required />
					<FileUpload label="Règlement intérieur signé" name="reglementInterieur" accept=".pdf,.png,.jpg,.jpeg,.webp" maxSizeMB={8} hint={f?.reglementInterieurPath ? 'Déjà déposé — remplacer' : undefined} required />
					{#if sportif}
						<FileUpload label="Attestation sportif de haut niveau" name="attestationSportif" accept=".pdf,.png,.jpg,.jpeg,.webp" maxSizeMB={8} hint={f?.attestationSportifPath ? 'Déjà déposé — remplacer' : undefined} required />
					{/if}
					{#if rqth}
						<FileUpload label="Attestation RQTH" name="attestationRqth" accept=".pdf,.png,.jpg,.jpeg,.webp" maxSizeMB={8} hint={f?.attestationRqthPath ? 'Déjà déposé — remplacer' : undefined} required />
					{/if}
					{#if dejaAlternance}
						<FileUpload label="Ancien contrat d'alternance (CERFA)" name="ancienCerfa" accept=".pdf,.png,.jpg,.jpeg,.webp" maxSizeMB={8} hint={f?.ancienCerfaPath ? 'Déjà déposé — remplacer' : undefined} required />
					{/if}
				</div>

				{#if errorMsg}<div class="cs-form__err">⚠ {errorMsg}</div>{/if}
				<div class="cs-form__actions">
					<Button variant="primary" type="submit" disabled={saving}>{saving ? 'Envoi…' : 'Envoyer ma fiche'}</Button>
				</div>
			</form>
		{:else}
			{@const f = data.fiche}
			<header class="cs-pub__head">
				<h1>Fiche de renseignements entreprise</h1>
				<p>
					En vue d'établir le contrat d'alternance{#if data.apprenti} de <strong>{data.apprenti}</strong>{/if}. En retour, nous
					vous ferons parvenir la convention de formation et le CERFA.
				</p>
				{#if data.submitted}<p class="cs-pub__note">Fiche déjà envoyée — vous pouvez la corriger et la renvoyer.</p>{/if}
			</header>

			<form class="cs-form" onsubmit={(e) => submit(e, 'submitEntreprise')}>
				<div class="cs-field">
					<label class="cs-label" for="typeContrat">Type de contrat</label>
					<select id="typeContrat" name="typeContrat" class="cs-select" required value={f?.typeContrat ?? data.typeContrat ?? ''}>
						<option value="">—</option>
						<option value="apprentissage">Contrat d'apprentissage</option>
						<option value="professionnalisation">Contrat de professionnalisation</option>
					</select>
				</div>

				<p class="cs-form__section">Entreprise</p>
				<Input label="Nom / Raison sociale" name="raisonSociale" value={f?.raisonSociale ?? data.entreprise ?? ''} required />
				<Input label="Adresse complète du siège social" name="adresseSiege" value={f?.adresseSiege ?? ''} required />
				<div class="cs-form__row">
					<Input label="Adresse d'exécution (si différente)" name="adresseExecution" value={f?.adresseExecution ?? ''} />
					<Input label="SIRET de l'adresse d'exécution" name="siretExecution" value={f?.siretExecution ?? ''} digitsOnly inputmode="numeric" maxlength={14} />
				</div>
				<div class="cs-form__row">
					<Input label="SIRET du siège social" name="siretSiege" value={f?.siretSiege ?? ''} digitsOnly inputmode="numeric" maxlength={14} required />
					<Input label="Code APE / NAF" name="codeApeNaf" value={f?.codeApeNaf ?? ''} maxlength={5} required />
				</div>
				<div class="cs-form__row">
					<Input label="Type d'employeur" name="typeEmployeur" value={f?.typeEmployeur ?? ''} required />
					<Input label="Forme juridique" name="formeJuridique" value={f?.formeJuridique ?? ''} required />
				</div>
				<div class="cs-form__row">
					<Input label="Téléphone" name="tel" type="tel" value={f?.tel ?? ''} digitsOnly inputmode="numeric" maxlength={10} required />
					<Input label="Code IDCC" name="codeIdcc" value={f?.codeIdcc ?? ''} digitsOnly inputmode="numeric" maxlength={4} required />
				</div>
				<div class="cs-form__row">
					<Input label="Nombre de salariés" name="nbSalaries" type="number" value={f?.nbSalaries != null ? String(f.nbSalaries) : ''} required />
					<div class="cs-field">
						<label class="cs-label" for="opco">Nom de votre OPCO<span class="cs-req">*</span></label>
						<select id="opco" name="opco" class="cs-select" required value={f?.opco ?? ''}>
							<option value="">—</option>
							{#each OPCO_ORGANISMES as o}<option value={o}>{o}</option>{/each}
						</select>
					</div>
				</div>
				<div class="cs-form__row">
					<Input label="Caisse de retraite complémentaire" name="caisseRetraite" value={f?.caisseRetraite ?? ''} required />
					<Input label="Organisme de prévoyance" name="prevoyance" value={f?.prevoyance ?? ''} />
				</div>
				<p class="cs-form__sub">Chef d'entreprise</p>
				<div class="cs-form__row">
					<Input label="Nom / Prénom" name="chefNom" value={f?.chefNom ?? ''} required />
					<Input label="Email" name="chefMail" type="email" value={f?.chefMail ?? ''} required />
				</div>
				<Input label="Téléphone" name="chefTel" type="tel" value={f?.chefTel ?? ''} digitsOnly inputmode="numeric" maxlength={10} required />

				<p class="cs-form__sub">Contact RH</p>
				<div class="cs-form__row">
					<Input label="Nom / Prénom" name="rhNom" value={f?.rhNom ?? ''} required />
					<Input label="Email" name="rhMail" type="email" value={f?.rhMail ?? ''} required />
				</div>
				<Input label="Téléphone" name="rhTel" type="tel" value={f?.rhTel ?? ''} digitsOnly inputmode="numeric" maxlength={10} required />
				<Input label="Secteur public — adhésion assurance chômage de l'apprenti" name="assuranceChomagePublic" value={f?.assuranceChomagePublic ?? ''} />
				<label class="cs-check cs-check--strong">
					<input type="checkbox" name="mandatOpco" value="1" checked={f?.mandatOpco ?? false} />
					<span>Je donne mandat au CFA pour les démarches auprès de l'OPCO</span>
				</label>

				<p class="cs-form__section">Contribution obligatoire (facturation)</p>
				<div class="cs-form__row">
					<Input label="Adresse complète de facturation" name="factuAdresse" value={f?.factuAdresse ?? ''} required />
					<Input label="Adresse mail de facturation" name="factuMail" type="email" value={f?.factuMail ?? ''} required />
				</div>

				<p class="cs-form__section">Tuteur / Maître d'apprentissage</p>
				<div class="cs-form__row">
					<Input label="Nom" name="tuteurNom" value={f?.tuteurNom ?? ''} required />
					<Input label="Prénom" name="tuteurPrenom" value={f?.tuteurPrenom ?? ''} required />
				</div>
				<div class="cs-form__row">
					<Input label="Téléphone" name="tuteurTel" type="tel" value={f?.tuteurTel ?? ''} digitsOnly inputmode="numeric" maxlength={10} required />
					<Input label="Date de naissance" name="tuteurDateNaissance" type="date" value={f?.tuteurDateNaissance ?? ''} required />
				</div>
				<div class="cs-form__row">
					<Input label="Email" name="tuteurMail" type="email" value={f?.tuteurMail ?? ''} required />
					<Input label="Fonction" name="tuteurFonction" value={f?.tuteurFonction ?? ''} required />
				</div>
				<div class="cs-form__row">
					<Input label="Années d'expérience professionnelle" name="tuteurExperience" type="number" value={f?.tuteurExperience != null ? String(f.tuteurExperience) : ''} required />
					<div class="cs-field">
						<label class="cs-label" for="tuteurNbAlternants">Nb d'alternants sous tutorat (max 2)</label>
						<select id="tuteurNbAlternants" name="tuteurNbAlternants" class="cs-select" required value={f?.tuteurNbAlternants != null ? String(f.tuteurNbAlternants) : ''}>
							<option value="">—</option>
							<option value="0">0</option>
							<option value="1">1</option>
							<option value="2">2</option>
						</select>
					</div>
				</div>
				<Input label="Diplôme le plus élevé obtenu (tuteur)" name="tuteurDiplome" value={f?.tuteurDiplome ?? ''} required />

				<p class="cs-form__section">Contrat</p>
				<div class="cs-form__row">
					<Input label="Salaire brut mensuel" name="salaireBrut" value={f?.salaireBrut ?? ''} digitsOnly inputmode="numeric" required />
					<Input label="SMIC ou SMC" name="smicSmc" value={f?.smicSmc ?? ''} required />
				</div>
				<Input label="Date de début de contrat" name="dateDebut" type="date" value={f?.dateDebut ?? ''} required />

				{#if errorMsg}<div class="cs-form__err">⚠ {errorMsg}</div>{/if}
				<div class="cs-form__actions">
					<Button variant="primary" type="submit" disabled={saving}>{saving ? 'Envoi…' : 'Envoyer la fiche'}</Button>
				</div>
			</form>
		{/if}
	</div>
</div>

<style>
	.cs-pub {
		min-height: 100vh;
		background: var(--c-bg);
		padding: 32px 16px;
		display: flex;
		justify-content: center;
	}
	.cs-pub__card {
		width: 100%;
		max-width: 720px;
		background: var(--c-card);
		border: 1px solid var(--c-border);
		border-radius: 16px;
		padding: 28px 30px;
	}
	.cs-pub__state {
		text-align: center;
		padding: 40px 0;
	}
	.cs-pub__state-icon {
		font-size: 46px;
	}
	.cs-pub__state h1 {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 22px;
		color: var(--c-text);
		margin: 12px 0 6px;
	}
	.cs-pub__state p {
		color: var(--c-muted);
		font-size: 14px;
	}
	.cs-pub__head h1 {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 22px;
		color: var(--c-text);
	}
	.cs-pub__head p {
		font-size: 14px;
		color: var(--c-muted);
		margin-top: 6px;
		line-height: 1.5;
	}
	.cs-pub__note {
		margin-top: 8px;
		font-size: 13px;
		color: var(--c-blue);
		font-weight: 600;
	}
	.cs-pub__known {
		margin: 18px 0;
		padding: 12px 14px;
		background: var(--c-bg);
		border-radius: 10px;
	}
	.cs-pub__known-title {
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.4px;
		color: var(--c-muted);
		margin-bottom: 6px;
	}
	.cs-pub__known-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 6px 16px;
		font-size: 13px;
		color: var(--c-text);
	}
	.cs-form {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin-top: 8px;
	}
	.cs-form__section {
		font-family: var(--font-display);
		font-size: 13px;
		font-weight: 700;
		color: var(--c-sub);
		text-transform: uppercase;
		letter-spacing: 0.4px;
		margin-top: 10px;
		padding-top: 12px;
		border-top: 1px solid var(--c-border);
	}
	.cs-form__sub {
		font-family: var(--font-display);
		font-size: 12px;
		font-weight: 700;
		color: var(--c-muted);
		text-transform: uppercase;
		letter-spacing: 0.4px;
		margin-top: 4px;
	}
	.cs-form__row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}
	.cs-select {
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
	.cs-select:focus {
		border-color: var(--c-blue);
	}
	.cs-check {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 14px;
		color: var(--c-sub);
		cursor: pointer;
	}
	/* Mandat OPCO : case à cocher mise en avant (encart coloré, texte renforcé). */
	.cs-check--strong {
		align-items: flex-start;
		gap: 12px;
		margin: 4px 0;
		padding: 14px 16px;
		border: 1.5px solid var(--c-blue);
		border-radius: 10px;
		background: var(--c-blue-soft);
		font-size: 15px;
		font-weight: 700;
		color: var(--c-text);
		line-height: 1.4;
	}
	.cs-check--strong input {
		width: 20px;
		height: 20px;
		flex-shrink: 0;
		accent-color: var(--c-blue);
		cursor: pointer;
	}
	.cs-form__checks {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.cs-form__docs {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.cs-form__err {
		background: var(--c-red-light);
		color: var(--c-red);
		font-size: 13px;
		padding: 10px 14px;
		border-radius: 8px;
	}
	.cs-form__actions {
		display: flex;
		justify-content: flex-end;
		margin-top: 10px;
	}
	@media (max-width: 560px) {
		.cs-form__row {
			grid-template-columns: 1fr;
		}
		.cs-pub__card {
			padding: 20px 18px;
		}
	}
</style>
