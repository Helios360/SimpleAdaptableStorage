<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageServerData } from './$types';

	let { data, form }: { data: PageServerData; form: ActionData } = $props();

	let sejour = $state(false);
</script>

<svelte:head>
	<link rel="stylesheet" href="/styles/main.css" />
</svelte:head>

<main>
	<form method="post" enctype="multipart/form-data" class="form" use:enhance>
		<div class="register">
			<div>
				<label for="formation_id">Formation *</label>
				<select id="formation_id" name="formation_id" required>
					{#each data.formations as f}
						<option value={f.id}>{f.name}</option>
					{/each}
				</select>
			</div>

			<div>
				<label for="name">Nom *</label>
				<input type="text" id="name" name="name" required />
			</div>
			<div>
				<label for="fname">Prénom *</label>
				<input type="text" id="fname" name="fname" required />
			</div>
			<div>
				<label for="email">Email *</label>
				<input type="email" id="email" name="email" required />
			</div>
			<div>
				<label for="tel">Téléphone *</label>
				<input type="tel" id="tel" name="tel" required />
			</div>
			<div>
				<label for="addr">Adresse</label>
				<input type="text" id="addr" name="addr" />
			</div>
			<div>
				<label for="postal">Code postal</label>
				<input type="text" id="postal" name="postal" />
			</div>
			<div>
				<label for="city">Ville *</label>
				<input type="text" id="city" name="city" required />
			</div>
			<div>
				<label for="birth">Date de naissance *</label>
				<input type="date" id="birth" name="birth" required />
			</div>
		</div>

		<hr />

		<div class="register">
			<ul class="form2 inputs">
				<p>Documents :</p>
				<li class="file-upload inputs">
					<label class="inputs" for="cv">CV (.pdf) *</label>
					<input class="inputs" type="file" id="cv" name="cv" accept=".pdf" required />
				</li>

				<span class="checks">
					<input
						type="checkbox"
						id="sejour"
						name="sejour"
						bind:checked={sejour}
					/>
					<label for="sejour">J'ai un titre de séjour plutôt qu'une pièce d'identité</label>
				</span>

				{#if sejour}
					<div id="titre-valide">
						<label for="titre-sejour">Date d'invalidité du titre de séjour *</label>
						<input type="date" id="titre-sejour" name="titre" required />
					</div>
				{/if}

				<li class="file-upload">
					<label class="inputs" for="id_doc">
						{sejour ? 'Titre de séjour (recto)' : "Pièce d'identité (recto)"} (.png/.jpg/.pdf) *
					</label>
					<input
						class="inputs"
						type="file"
						id="id_doc"
						name="id_doc"
						accept=".png, .jpg, .jpeg, .pdf"
						required
					/>
				</li>
				<li class="file-upload">
					<label class="inputs" for="id_doc_verso">
						{sejour ? 'Titre de séjour (verso)' : "Pièce d'identité (verso)"} (.png/.jpg/.pdf) *
					</label>
					<input
						class="inputs"
						type="file"
						id="id_doc_verso"
						name="id_doc_verso"
						accept=".png, .jpg, .jpeg, .pdf"
						required
					/>
				</li>
			</ul>

			<div>
				<span class="checks">
					<input type="checkbox" id="permis" name="permis" />
					<label for="permis">Permis B</label>
				</span>
				<span class="checks">
					<input type="checkbox" id="vehicule" name="vehicule" />
					<label for="vehicule">Véhiculé</label>
				</span>
				<span class="checks">
					<input type="checkbox" id="mobile" name="mobile" />
					<label for="mobile">Mobile géographiquement</label>
				</span>
			</div>

			<div>
				<label for="password">Mot de passe *</label>
				<input class="inputs" type="password" id="password" name="password" required />
			</div>
			<div>
				<label for="confirm">Confirmer le mot de passe *</label>
				<input class="inputs" type="password" id="confirm" name="confirm" required />
			</div>

			<div class="checkbox">
				<label for="consent">
					<u>J’accepte les conditions d’utilisation et la politique de confidentialité de Cloud Campus.</u>
				</label>
				<input type="checkbox" id="consent" name="consent" required />
			</div>

			<button type="submit" id="send">Envoyer</button>
			<a href="/signin"><u>Vous avez déjà un compte ?</u></a>

			{#if form?.message}
				<p style="color: red">{form.message}</p>
			{/if}
		</div>
	</form>
</main>
