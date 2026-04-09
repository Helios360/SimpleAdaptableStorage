<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageServerData } from './$types';

	let { data, form }: { data: PageServerData; form: ActionData } = $props();
</script>

<svelte:head>
	<link rel="stylesheet" href="/styles/main.css" />
	<link rel="stylesheet" href="/styles/test.css" />
</svelte:head>

<main>
	<div class="normal">
		<h1>Tests</h1>

		<p>Progression : {data.attemptIndex} / {data.total}</p>

		{#if data.lastScore !== null && data.lastScore !== undefined && data.lastScore !== ''}
			<p>Score précédent : <strong>{data.lastScore}</strong> / 100</p>
		{/if}

		{#if form?.message}
			<p style="color: red">{form.message}</p>
		{/if}

		{#if !data.test}
			<p>Aucun test disponible pour le moment.</p>
		{:else}
			<div class="test">
				<h2>Question</h2>
				<p>{data.test.question}</p>

				<form method="post" action="?/submit" use:enhance>
					<input type="hidden" name="testId" value={data.test.id} />
					<textarea name="answer" rows="8" placeholder="Votre réponse..." required></textarea>
					<button type="submit">Envoyer</button>
				</form>
			</div>
		{/if}

		<a href="/profile">Retour au profil</a>
	</div>
</main>
