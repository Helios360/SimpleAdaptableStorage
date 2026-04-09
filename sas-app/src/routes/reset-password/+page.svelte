<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageServerData } from './$types';

	let { data, form }: { data: PageServerData; form: ActionData } = $props();
	const hasToken = $derived(Boolean(data.token && data.email));
</script>

<svelte:head>
	<link rel="stylesheet" href="/styles/main.css" />
</svelte:head>

<main>
	<div class="normal">
		<h1>Réinitialisation du mot de passe</h1>

		{#if form?.message}
			<p>{form.message}</p>
		{/if}

		{#if hasToken}
			<p>Veuillez entrer votre nouveau mot de passe.</p>

			<form method="post" action="?/confirm" class="form" use:enhance>
				<div class="forgot">
					<input type="hidden" name="email" value={data.email} />
					<input type="hidden" name="token" value={data.token} />
					<input class="inputs" type="password" name="password" placeholder="Nouveau mot de passe" required />
					<button type="submit">Envoyer</button>
				</div>
			</form>
		{:else}
			<p>
				Entrez votre adresse email pour recevoir un lien de réinitialisation (pensez à regarder vos spams).
			</p>

			<form method="post" action="?/request" class="form" use:enhance>
				<div class="forgot">
					<input class="inputs" type="email" name="email" placeholder="Email" required />
					<button type="submit">Envoyer</button>
				</div>
			</form>
		{/if}

		<a href="/signin">Retour</a>
	</div>
</main>
