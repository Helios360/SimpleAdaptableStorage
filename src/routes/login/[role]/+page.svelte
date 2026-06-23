<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import Input from '$lib/components/Input.svelte';
	import Button from '$lib/components/Button.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Logo from '$lib/components/Logo.svelte';
	import { applyAction, enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let email = $state('');
	$effect(() => {
		const f = form as { email?: string } | null;
		if (f?.email && !email) email = f.email;
	});
	let password = $state('');
	let loading = $state(false);

	const roleLabel = { candidat: 'Candidat', cre: 'École', recruteur: 'Recruteur' };
	const roleColor = {
		candidat: 'var(--c-blue)',
		cre: 'var(--c-purple)',
		recruteur: 'var(--c-accent)'
	};
</script>

<div class="cs-auth">
	<div class="cs-auth__inner">
		<a href="/" class="cs-auth__back">← Retour</a>
		<Card padding="32px">
			<div class="cs-auth__brand">
				<Logo size={40} />
				<div class="cs-login__role-tag">
					<Badge
						label={roleLabel[data.role]}
						color="{roleColor[data.role]}22"
						textColor={roleColor[data.role]}
						size={13}
					/>
				</div>
			</div>

			<form
				method="POST"
				action="?/login"
				class="cs-auth__form"
				use:enhance={() => {
					loading = true;
					return async ({ result }) => {
						loading = false;
						await applyAction(result);
					};
				}}
			>
				<Input
					label="Adresse email"
					name="email"
					type="email"
					bind:value={email}
					placeholder="prenom@email.fr"
					required
					autofocus
				/>
				<Input
					label="Mot de passe"
					name="password"
					type="password"
					bind:value={password}
					placeholder="••••••••"
					required
				/>
				{#if form?.error}
					<div class="cs-alert cs-alert--error">⚠ {form.error}</div>
				{/if}
				{#if form?.sent}
					<div class="cs-alert cs-alert--success">
						✓ Si un compte existe pour cet email, un lien de réinitialisation vient d'être envoyé.
					</div>
				{/if}
				<Button variant="primary" size="lg" type="submit" disabled={loading} fullWidth>
					{loading ? 'Connexion…' : 'Se connecter'}
				</Button>
				<button type="submit" formaction="?/forgot" formnovalidate class="cs-login__forgot">
					Mot de passe oublié ?
				</button>
			</form>
			{#if data.role === 'candidat'}
				<p class="cs-login__signup">
					Pas encore de compte ? <a href="/register">Créer un compte étudiant</a>
				</p>
			{/if}
		</Card>
	</div>
</div>

<style>
	.cs-login__role-tag {
		margin-top: 8px;
	}
	.cs-login__forgot {
		background: none;
		border: none;
		color: var(--c-muted);
		cursor: pointer;
		font-size: 13px;
		text-align: center;
		padding: 0;
		margin-top: -4px;
	}
	.cs-login__forgot:hover {
		color: var(--c-blue);
		text-decoration: underline;
	}
	.cs-login__signup {
		text-align: center;
		margin-top: 10px;
		font-size: 13px;
		color: var(--c-muted);
	}
	.cs-login__signup a {
		color: var(--c-blue);
		font-weight: 600;
		text-decoration: none;
	}
</style>
