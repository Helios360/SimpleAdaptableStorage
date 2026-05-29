<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import Input from '$lib/components/Input.svelte';
	import Button from '$lib/components/Button.svelte';
	import { applyAction, enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let password = $state('');
	let confirm = $state('');
	let loading = $state(false);
</script>

<div class="cs-rp">
	<div class="cs-rp__inner">
		<Card padding="32px">
			<div class="cs-rp__brand">
				<div class="cs-rp__title">
					Cloud<span>Student</span>
				</div>
				<p class="cs-rp__sub">Définissez votre mot de passe</p>
			</div>

			<form
				method="POST"
				class="cs-rp__form"
				use:enhance={() => {
					loading = true;
					return async ({ result }) => {
						loading = false;
						await applyAction(result);
					};
				}}
			>
				<input type="hidden" name="token" value={data.token} />
				<Input
					label="Nouveau mot de passe"
					name="password"
					type="password"
					bind:value={password}
					placeholder="••••••••"
					required
					minlength={4}
					autofocus
				/>
				<Input
					label="Confirmer le mot de passe"
					name="confirm"
					type="password"
					bind:value={confirm}
					placeholder="••••••••"
					required
					minlength={4}
				/>

				{#if form?.error}
					<div class="cs-rp__err">⚠ {form.error}</div>
				{/if}

				<Button variant="primary" size="lg" type="submit" disabled={loading} fullWidth>
					{loading ? 'Enregistrement…' : 'Définir mon mot de passe'}
				</Button>
			</form>
		</Card>
	</div>
</div>

<style>
	.cs-rp {
		min-height: 100vh;
		background: var(--c-bg);
		display: grid;
		place-items: center;
		padding: 24px;
	}
	.cs-rp__inner {
		width: 100%;
		max-width: 400px;
	}
	.cs-rp__brand {
		text-align: center;
		margin-bottom: 22px;
	}
	.cs-rp__title {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 22px;
		color: var(--c-navy);
	}
	.cs-rp__title span {
		color: var(--c-accent);
	}
	.cs-rp__sub {
		font-size: 13px;
		color: var(--c-muted);
		margin-top: 8px;
	}
	.cs-rp__form {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.cs-rp__err {
		background: var(--c-red-light);
		color: var(--c-red);
		font-size: 13px;
		padding: 10px 14px;
		border-radius: 8px;
	}
</style>
