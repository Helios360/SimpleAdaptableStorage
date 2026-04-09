<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageServerData } from './$types';

	let { data, form }: { data: PageServerData; form: ActionData } = $props();
</script>

<svelte:head>
	<link rel="stylesheet" href="/styles/main.css" />
	<link rel="stylesheet" href="/styles/admin.css" />
</svelte:head>

<main>
	<div class="normal">
		<h1>Admin panel</h1>
		<p>Connecté en tant que {data.user.email}</p>

		{#if form?.message}
			<p style="color: #0f766e">{form.message}</p>
		{/if}

		<form method="get" class="form" style="max-width: 900px">
			<div class="register">
				<div>
					<label for="q">Recherche</label>
					<input id="q" name="q" value={data.filters.q} placeholder="Nom / prénom / email" />
				</div>

				<div>
					<label for="status">Status</label>
					<select id="status" name="status">
						<option value="" selected={data.filters.status === ''}>Tous</option>
						<option value="recherche" selected={data.filters.status === 'recherche'}>Recherche</option>
						<option value="active" selected={data.filters.status === 'active'}>Recherche active</option>
						<option value="entreprise" selected={data.filters.status === 'entreprise'}>Entreprise</option>
						<option value="archive" selected={data.filters.status === 'archive'}>Archive</option>
					</select>
				</div>

				<div>
					<label for="pageSize">Taille</label>
					<select id="pageSize" name="pageSize">
						<option value="10" selected={data.filters.pageSize === 10}>10</option>
						<option value="20" selected={data.filters.pageSize === 20}>20</option>
						<option value="50" selected={data.filters.pageSize === 50}>50</option>
					</select>
				</div>
			</div>
			<button type="submit">Filtrer</button>
		</form>

		<hr />

		{#if data.staffFormations.length === 0}
			<p style="color: #b45309">
				Aucune formation assignée à ce compte admin (StaffSettings). Vous ne verrez aucun utilisateur.
			</p>
		{/if}

		<table style="width: 100%; border-collapse: collapse">
			<thead>
				<tr>
					<th style="text-align: left">Nom</th>
					<th style="text-align: left">Email</th>
					<th style="text-align: left">Formation</th>
					<th style="text-align: left">Ville</th>
					<th style="text-align: left">Status</th>
					<th style="text-align: left">Docs</th>
					<th style="text-align: left">Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each data.users as u}
					<tr style="border-top: 1px solid #334155">
						<td>{u.fname} {u.name}</td>
						<td>{u.email}</td>
						<td>{u.formationName ?? u.formationId}</td>
						<td>{u.city}</td>
						<td>{u.status}</td>
						<td>
							<a href={`/api/admin/user/${u.id}/files/cv`} target="_blank" rel="noreferrer">CV</a>
							|
							<a href={`/api/admin/user/${u.id}/files/id_doc`} target="_blank" rel="noreferrer">PI R</a>
							|
							<a href={`/api/admin/user/${u.id}/files/id_doc_verso`} target="_blank" rel="noreferrer">
								PI V
							</a>
						</td>
						<td>
							<form method="post" action="?/resetTests" use:enhance style="display: inline">
								<input type="hidden" name="id" value={u.id} />
								<button type="submit">Reset tests</button>
							</form>

							<form
								method="post"
								action="?/deleteUser"
								use:enhance
								style="display: inline"
								onsubmit={(e) => {
									if (!confirm(`Supprimer ${u.email} ?`)) e.preventDefault();
								}}
							>
								<input type="hidden" name="id" value={u.id} />
								<button type="submit" style="background: #b91c1c">Supprimer</button>
							</form>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>

		<p>
			Page {data.pagination.page} / {data.pagination.totalPages} — total: {data.pagination.total}
		</p>

		<div style="display: flex; gap: 8px; flex-wrap: wrap">
			{#if data.pagination.page > 1}
				<a
					href={`?page=${data.pagination.page - 1}&pageSize=${data.filters.pageSize}&q=${encodeURIComponent(data.filters.q)}&status=${encodeURIComponent(data.filters.status)}`}
				>
					Précédent
				</a>
			{/if}
			{#if data.pagination.page < data.pagination.totalPages}
				<a
					href={`?page=${data.pagination.page + 1}&pageSize=${data.filters.pageSize}&q=${encodeURIComponent(data.filters.q)}&status=${encodeURIComponent(data.filters.status)}`}
				>
					Suivant
				</a>
			{/if}
		</div>

		<a href="/profile">Retour au profil</a>
	</div>
</main>
