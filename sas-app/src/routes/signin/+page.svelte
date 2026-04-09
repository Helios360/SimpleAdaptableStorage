

<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<link rel="stylesheet" href="/styles/main.css" />
</svelte:head>

<main>
	<img src="/sources/LogoBleuOmbre-edited.png" alt="Cloud Campus" />

	<form method="post" class="form" use:enhance>
		<div class="signin">
			<input class="inputs" type="email" name="email" placeholder="Email . . ." required />
			<input class="inputs" type="password" name="password" placeholder="Mot de passe . . ." required />
			<button type="submit">Envoyer</button>

			{#if form?.message}
				<p style="color: red">{form.message}</p>
			{/if}

			<span>
				<a href="/register"><u>Créer un compte</u></a>
				<a href="/reset-password"><u>Mot de passe oublié ?</u></a>
			</span>
		</div>
	</form>
</main>
