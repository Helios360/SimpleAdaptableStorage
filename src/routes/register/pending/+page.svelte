<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import Button from '$lib/components/Button.svelte';
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const isRefused = $derived(data.statut === 'refuse');
</script>

<div class="cs-pend">
	<div class="cs-pend__inner">
		<Card padding="40px 32px">
			<div class="cs-pend__icon">
				{isRefused ? '⛔' : '⏳'}
			</div>
			<h1 class="cs-pend__title">
				{isRefused ? 'Dossier refusé' : 'En attente de validation'}
			</h1>
			<p class="cs-pend__msg">
				{#if isRefused}
					Bonjour <strong>{data.name}</strong>, ton dossier a été refusé par l'administration. Pour plus d'informations, contacte ton école.
				{:else}
					Bonjour <strong>{data.name}</strong>, ton compte a bien été créé.<br />
					Un administrateur doit valider ton dossier avant que tu puisses accéder à la plateforme.
				{/if}
			</p>
			<p class="cs-pend__email">📧 {data.email}</p>

			<form method="POST" action="/logout" use:enhance class="cs-pend__logout">
				<Button type="submit" variant="ghost" fullWidth>Se déconnecter</Button>
			</form>
		</Card>
	</div>
</div>

<style>
	.cs-pend {
		min-height: 100vh;
		background: var(--c-bg);
		display: grid;
		place-items: center;
		padding: 24px;
	}
	.cs-pend__inner {
		width: 100%;
		max-width: 440px;
	}
	.cs-pend__icon {
		font-size: 48px;
		text-align: center;
		margin-bottom: 12px;
	}
	.cs-pend__title {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 22px;
		color: var(--c-navy);
		text-align: center;
		margin-bottom: 14px;
	}
	.cs-pend__msg {
		font-size: 14px;
		color: var(--c-sub);
		text-align: center;
		line-height: 1.6;
		margin-bottom: 14px;
	}
	.cs-pend__email {
		font-size: 13px;
		color: var(--c-muted);
		text-align: center;
		margin-bottom: 24px;
	}
	.cs-pend__logout {
		margin-top: 6px;
	}
</style>
