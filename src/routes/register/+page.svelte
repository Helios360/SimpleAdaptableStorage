<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import Input from '$lib/components/Input.svelte';
	import Button from '$lib/components/Button.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Logo from '$lib/components/Logo.svelte';
	import FileUpload from '$lib/components/FileUpload.svelte';
	import { applyAction, enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { form, data }: { form: ActionData; data: PageData } = $props();

	let fname = $state('');
	let lname = $state('');
	let email = $state('');
	let password = $state('');
	let confirm = $state('');
	let formation = $state('');
	let ville = $state('');
	let tel = $state('');
	let sejour = $state(false);
	let titreValide = $state('');
	let loading = $state(false);

	$effect(() => {
		const f = form as Record<string, string> | null;
		if (!f) return;
		fname ||= f.fname ?? '';
		lname ||= f.lname ?? '';
		email ||= f.email ?? '';
		formation ||= f.formation ?? '';
		ville ||= f.ville ?? '';
		tel ||= f.tel ?? '';
	});

	const idRectoLabel = $derived(sejour ? 'Titre de séjour (recto)' : "Pièce d'identité (recto)");
	const idVersoLabel = $derived(sejour ? 'Titre de séjour (verso)' : "Pièce d'identité (verso)");
</script>

<div class="cs-auth">
	<div class="cs-auth__inner cs-reg__inner">
		<a href="/" class="cs-auth__back">← Retour</a>
		<Card padding="32px">
			<div class="cs-auth__brand cs-reg__brand">
				<Logo size={40} />
				<div class="cs-reg__tag">
					<Badge label="Inscription étudiant" color="var(--c-blue-light)" textColor="var(--c-blue)" size={13} />
				</div>
			</div>

			<p class="cs-reg__intro">
				Crée ton compte étudiant. Ton dossier sera ensuite validé par un administrateur avant que tu puisses accéder à la plateforme.
			</p>

			<form
				method="POST"
				enctype="multipart/form-data"
				class="cs-reg__form"
				use:enhance={() => {
					loading = true;
					return async ({ result }) => {
						loading = false;
						await applyAction(result);
					};
				}}
			>
				<div class="cs-grid-2">
					<Input label="Prénom" name="fname" bind:value={fname} placeholder="Léa" required autofocus />
					<Input label="Nom" name="lname" bind:value={lname} placeholder="Martin" required />
				</div>
				<Input label="Email" name="email" type="email" bind:value={email} placeholder="prenom@email.fr" required />
				<div class="cs-grid-2">
					<Input
						label="Mot de passe"
						name="password"
						type="password"
						bind:value={password}
						placeholder="••••••••"
						required
						minlength={4}
					/>
					<Input
						label="Confirmer"
						name="confirm"
						type="password"
						bind:value={confirm}
						placeholder="••••••••"
						required
						minlength={4}
					/>
				</div>
				<div class="cs-field">
					<label for="formation" class="cs-label">Formation<span class="cs-req">*</span></label>
					<select id="formation" name="formation" bind:value={formation} required class="cs-input">
						<option value="" disabled>Sélectionne ta formation…</option>
						{#each data.formations as f}
							<option value={String(f.id)}>{f.name}</option>
						{/each}
					</select>
				</div>
				<div class="cs-grid-2">
					<Input label="Ville" name="ville" bind:value={ville} placeholder="Paris" required />
					<Input label="Téléphone" name="tel" type="tel" bind:value={tel} placeholder="06 12 34 56 78" required />
				</div>

				<div class="cs-reg__docs">
					<div class="cs-section-label cs-reg__docs-title">Documents</div>

					<FileUpload
						label="CV"
						name="cv"
						accept=".pdf"
						hint="PDF uniquement, 2 Mo max"
						maxSizeMB={2}
						required
					/>

					<label class="cs-reg__check">
						<input type="checkbox" name="sejour" bind:checked={sejour} value="1" />
						<span>J'ai un titre de séjour</span>
					</label>

					{#if sejour}
						<Input
							label="Date d'invalidité du titre de séjour"
							name="titre"
							type="date"
							bind:value={titreValide}
							required
						/>
					{/if}

					<FileUpload
						label={idRectoLabel}
						name="id_doc"
						accept=".png,.jpg,.jpeg,.pdf"
						hint="PNG / JPG / PDF, 3 Mo max"
						maxSizeMB={3}
						required
					/>
					<FileUpload
						label={idVersoLabel}
						name="id_doc_verso"
						accept=".png,.jpg,.jpeg,.pdf"
						hint="PNG / JPG / PDF, 3 Mo max"
						maxSizeMB={3}
						required
					/>
				</div>

				{#if form?.error}
					<div class="cs-alert cs-alert--error">⚠ {form.error}</div>
				{/if}

				<Button variant="primary" size="lg" type="submit" disabled={loading} fullWidth>
					{loading ? 'Création…' : 'Créer mon compte'}
				</Button>
			</form>

			<p class="cs-reg__hint">
				Déjà un compte ? <a href="/login/candidat">Se connecter</a>
			</p>
		</Card>
	</div>
</div>

<style>
	.cs-reg__inner {
		max-width: 480px;
	}
	.cs-reg__brand {
		margin-bottom: 16px;
	}
	.cs-reg__tag {
		margin-top: 8px;
	}
	.cs-reg__intro {
		font-size: 13px;
		color: var(--c-muted);
		text-align: center;
		margin-bottom: 22px;
		line-height: 1.5;
	}
	.cs-reg__form {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.cs-reg__docs {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding-top: 8px;
		border-top: 1px solid var(--c-border);
		margin-top: 4px;
	}
	.cs-reg__docs-title {
		margin-top: 8px;
		margin-bottom: 2px;
	}
	.cs-reg__check {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		color: var(--c-sub);
		cursor: pointer;
		padding: 2px 0;
	}
	.cs-reg__check input {
		width: 16px;
		height: 16px;
		accent-color: var(--c-blue);
		cursor: pointer;
	}
	.cs-reg__hint {
		text-align: center;
		margin-top: 18px;
		font-size: 13px;
		color: var(--c-muted);
	}
	.cs-reg__hint a {
		color: var(--c-blue);
		font-weight: 600;
		text-decoration: none;
	}
</style>
