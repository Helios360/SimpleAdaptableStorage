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

	const roleLabel = { candidat: 'Candidat', cre: 'CRE / École', recruteur: 'Recruteur' };
	const roleColor = {
		candidat: 'var(--c-blue)',
		cre: 'var(--c-purple)',
		recruteur: 'var(--c-accent)'
	};

	function fillDemo() {
		email = data.demoEmail;
		password = 'demo';
	}
</script>

<div class="cs-login">
	<div class="cs-login__inner">
		<a href="/" class="cs-login__back">← Retour</a>
		<Card padding="32px">
			<div class="cs-login__brand">
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

			<button
				type="button"
				class="cs-login__demo"
				style:--accent={roleColor[data.role]}
				onclick={fillDemo}
			>
				⚡ Pré-remplir les identifiants démo — {data.demoEmail}
			</button>

			<div class="cs-login__sep">
				<div></div>
				<span>ou</span>
				<div></div>
			</div>

			<form
				method="POST"
				class="cs-login__form"
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
					<div class="cs-login__err">⚠ {form.error}</div>
				{/if}
				<Button variant="primary" size="lg" type="submit" disabled={loading} fullWidth>
					{loading ? 'Connexion…' : 'Se connecter'}
				</Button>
			</form>
			<p class="cs-login__hint">Mot de passe démo : <strong>demo</strong></p>
			{#if data.role === 'candidat'}
				<p class="cs-login__signup">
					Pas encore de compte ? <a href="/register">Créer un compte étudiant</a>
				</p>
			{/if}
		</Card>
	</div>
</div>

<style>
	.cs-login {
		min-height: 100vh;
		background: var(--c-bg);
		display: grid;
		place-items: center;
		padding: 24px;
	}
	.cs-login__inner {
		width: 100%;
		max-width: 400px;
	}
	.cs-login__back {
		background: none;
		border: none;
		color: var(--c-muted);
		cursor: pointer;
		font-size: 13px;
		margin-bottom: 24px;
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.cs-login__brand {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-bottom: 24px;
	}
	.cs-login__role-tag {
		margin-top: 8px;
	}
	.cs-login__demo {
		width: 100%;
		padding: 12px 16px;
		border-radius: 10px;
		border: 1.5px dashed var(--accent);
		background: color-mix(in srgb, var(--accent) 5%, transparent);
		color: var(--accent);
		font-family: var(--font-body);
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		margin-bottom: 18px;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
	}
	.cs-login__sep {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 18px;
	}
	.cs-login__sep div {
		flex: 1;
		height: 1px;
		background: var(--c-border);
	}
	.cs-login__sep span {
		font-size: 11px;
		color: var(--c-muted);
	}
	.cs-login__form {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.cs-login__err {
		background: var(--c-red-light);
		color: var(--c-red);
		font-size: 13px;
		padding: 10px 14px;
		border-radius: 8px;
	}
	.cs-login__hint {
		text-align: center;
		margin-top: 18px;
		font-size: 12px;
		color: var(--c-muted);
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
	@media (max-width: 540px) {
		.cs-login {
			padding: 16px;
		}
		.cs-login__demo {
			font-size: 12px;
			padding: 10px 12px;
			overflow-wrap: anywhere;
		}
	}
</style>
