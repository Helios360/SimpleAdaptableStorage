<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageServerData } from './$types';

	let { data, form }: { data: PageServerData; form: ActionData } = $props();
</script>

<svelte:head>
	<link rel="stylesheet" href="/styles/main.css" />
	<link rel="stylesheet" href="/styles/profile.css" />
</svelte:head>

<main>
	<div class="normal">
		<h1>Profil</h1>
		<p>
			Connecté en tant que <strong>{data.user.fname} {data.user.name}</strong> ({data.user.email}).
		</p>
		<p>Ville: {data.user.city}{data.user.postal ? ` (${data.user.postal})` : ''}</p>
		<p>Status: {data.user.status}</p>

		{#if !data.user.emailVerified}
			<p style="color: #b45309">
				Votre email n'est pas vérifié. Certaines fonctionnalités peuvent être limitées.
			</p>
			<form method="post" action="?/sendVerification" use:enhance>
				<button type="submit">Renvoyer un email de vérification</button>
			</form>
		{/if}

		{#if form?.message}
			<p style="color: #0f766e">{form.message}</p>
		{/if}

		<hr />

		<h2>Documents</h2>

		<section>
			<h3>CV</h3>
			{#if data.user.cv}
				<a href="/api/me/files/cv" target="_blank" rel="noreferrer">Voir le CV</a>
			{:else}
				<p>Aucun CV pour le moment.</p>
			{/if}

			<form method="post" action="?/uploadDoc" enctype="multipart/form-data" use:enhance>
				<input type="hidden" name="kind" value="cv" />
				<input type="file" name="file" accept=".pdf" required />
				<button type="submit">{data.user.cv ? 'Remplacer' : 'Uploader'}</button>
			</form>

			<form method="post" action="?/deleteDoc" use:enhance>
				<input type="hidden" name="kind" value="cv" />
				<button type="submit" disabled={!data.user.cv}>Supprimer</button>
			</form>
		</section>

		<section>
			<h3>Pièce d'identité (recto)</h3>
			{#if data.user.idDoc}
				<a href="/api/me/files/id_doc" target="_blank" rel="noreferrer">Voir</a>
			{:else}
				<p>Aucun document pour le moment.</p>
			{/if}

			<form method="post" action="?/uploadDoc" enctype="multipart/form-data" use:enhance>
				<input type="hidden" name="kind" value="id_doc" />
				<input type="file" name="file" accept=".png,.jpg,.jpeg,.pdf" required />
				<button type="submit">{data.user.idDoc ? 'Remplacer' : 'Uploader'}</button>
			</form>

			<form method="post" action="?/deleteDoc" use:enhance>
				<input type="hidden" name="kind" value="id_doc" />
				<button type="submit" disabled={!data.user.idDoc}>Supprimer</button>
			</form>
		</section>

		<section>
			<h3>Pièce d'identité (verso)</h3>
			{#if data.user.idDocVerso}
				<a href="/api/me/files/id_doc_verso" target="_blank" rel="noreferrer">Voir</a>
			{:else}
				<p>Aucun document pour le moment.</p>
			{/if}

			<form method="post" action="?/uploadDoc" enctype="multipart/form-data" use:enhance>
				<input type="hidden" name="kind" value="id_doc_verso" />
				<input type="file" name="file" accept=".png,.jpg,.jpeg,.pdf" required />
				<button type="submit">{data.user.idDocVerso ? 'Remplacer' : 'Uploader'}</button>
			</form>

			<form method="post" action="?/deleteDoc" use:enhance>
				<input type="hidden" name="kind" value="id_doc_verso" />
				<button type="submit" disabled={!data.user.idDocVerso}>Supprimer</button>
			</form>
		</section>

		<hr />

		{#if data.sessionUser.is_admin}
			<a href="/admin-panel">Accéder au panel admin</a>
		{/if}

		<form method="post" action="?/logout" use:enhance>
			<button type="submit">Se déconnecter</button>
		</form>

		<form
			method="post"
			action="?/deleteAccount"
			use:enhance
			onsubmit={(e) => {
				if (!confirm('Supprimer définitivement votre compte ?')) e.preventDefault();
			}}
		>
			<button type="submit" style="background: #b91c1c">Supprimer mon compte</button>
		</form>
	</div>
</main>
