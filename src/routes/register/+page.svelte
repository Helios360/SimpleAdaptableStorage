<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import Input from '$lib/components/Input.svelte';
	import Button from '$lib/components/Button.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Logo from '$lib/components/Logo.svelte';
	import FileUpload from '$lib/components/FileUpload.svelte';
	import { applyAction, enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

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

<div class="cs-reg">
	<div class="cs-reg__inner">
		<a href="/" class="cs-reg__back">← Retour</a>
		<Card padding="32px">
			<div class="cs-reg__brand">
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
				<div class="cs-reg__row">
					<Input label="Prénom" name="fname" bind:value={fname} placeholder="Léa" required autofocus />
					<Input label="Nom" name="lname" bind:value={lname} placeholder="Martin" required />
				</div>
				<Input label="Email" name="email" type="email" bind:value={email} placeholder="prenom@email.fr" required />
				<div class="cs-reg__row">
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
				<Input label="Formation" name="formation" bind:value={formation} placeholder="Bac+3 Webdev" required />
				<div class="cs-reg__row">
					<Input label="Ville" name="ville" bind:value={ville} placeholder="Paris" required />
					<Input label="Téléphone" name="tel" type="tel" bind:value={tel} placeholder="06 12 34 56 78" required />
				</div>

				<div class="cs-reg__docs">
					<div class="cs-reg__docs-title">Documents</div>

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
						<span>J'ai un titre de séjour plutôt qu'une pièce d'identité</span>
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
					<div class="cs-reg__err">⚠ {form.error}</div>
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
	.cs-reg {
		min-height: 100vh;
		background: var(--c-bg);
		display: grid;
		place-items: center;
		padding: 24px;
	}
	.cs-reg__inner {
		width: 100%;
		max-width: 480px;
	}
	.cs-reg__back {
		color: var(--c-muted);
		font-size: 13px;
		margin-bottom: 24px;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		text-decoration: none;
	}
	.cs-reg__brand {
		display: flex;
		flex-direction: column;
		align-items: center;
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
	.cs-reg__row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
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
		font-size: 13px;
		font-weight: 700;
		color: var(--c-sub);
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
	@media (max-width: 480px) {
		.cs-reg__row {
			grid-template-columns: 1fr;
		}
	}
	.cs-reg__err {
		background: var(--c-red-light);
		color: var(--c-red);
		font-size: 13px;
		padding: 10px 14px;
		border-radius: 8px;
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
	@media (max-width: 540px) {
		.cs-reg {
			padding: 14px;
		}
	}
</style>
