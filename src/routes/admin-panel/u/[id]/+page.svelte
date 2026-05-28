<script lang="ts">
  import { enhance } from '$app/forms';
  import TagInput from '$components/TagInput.svelte';
  import FileSlot from '$components/FileSlot.svelte';
  import Alert from '$components/Alert.svelte';

  let { data, form } = $props();
  const p = $derived(data.profile);

  let tags = $state<string[]>(p.tags ?? []);
  let skills = $state<string[]>(p.skills ?? []);
</script>

<svelte:head><title>{p.fname} {p.name}</title><link rel="stylesheet" href="/styles/profile.css" /></svelte:head>

<div class="page">
  <a href="/admin-panel" class="small">← Retour à la liste</a>

  <div class="row between">
    <div>
      <h1>{p.fname} {p.name}</h1>
      <p class="muted">{data.email} · {data.formationName ?? 'Sans formation'}</p>
    </div>
    <div class="row">
      <form method="POST" action="?/resetTests" use:enhance>
        <button type="submit">Réinitialiser les tests</button>
      </form>
      <form method="POST" action="?/delete" use:enhance>
        <button
          type="submit"
          class="danger-btn"
          onclick={(e) => { if (!confirm('Supprimer ce candidat ?')) e.preventDefault(); }}
        >
          Supprimer
        </button>
      </form>
    </div>
  </div>

  {#if form?.success}<Alert kind="success">Modifications enregistrées.</Alert>{/if}
  {#if form?.message}<Alert kind="error">{form.message}</Alert>{/if}

  <div class="contain">
    <form class="info-view" method="POST" action="?/update" use:enhance>
      <ul class="info-list">
        <li><label for="fname">Prénom</label><input class="inputs" id="fname" name="fname" required value={p.fname} /></li>
        <li><label for="name">Nom</label><input class="inputs" id="name" name="name" required value={p.name} /></li>
        <li><label for="tel">Téléphone</label><input class="inputs" id="tel" name="tel" type="tel" value={p.tel} /></li>
        <li><label for="birth">Naissance</label><input class="inputs" id="birth" name="birth" type="date" value={p.birth ?? ''} /></li>
        <li><label for="addr">Adresse</label><input class="inputs" id="addr" name="addr" value={p.addr ?? ''} /></li>
        <li>
          <label for="city">Ville</label>
          <div class="city-postal">
            <input class="inputs" id="city" name="city" required value={p.city} />
            <input class="inputs" id="postal" name="postal" placeholder="CP" value={p.postal ?? ''} />
          </div>
        </li>
        <li>
          <label for="status">Statut</label>
          <select id="status" name="status" value={p.status}>
            <option value="recherche">Recherche</option>
            <option value="entreprise">Entreprise</option>
            <option value="active">Actif</option>
            <option value="archive">Archivé</option>
          </select>
        </li>
        <li>
          <label for="year">Année</label>
          <input class="inputs" id="year" name="year" type="number" value={p.year ?? ''} />
        </li>
      </ul>

      <span class="checks">
        <input type="checkbox" id="permis"   name="permis"   checked={p.permis} />
        <label for="permis">Permis</label>
        <input type="checkbox" id="vehicule" name="vehicule" checked={p.vehicule} />
        <label for="vehicule">Véhicule</label>
        <input type="checkbox" id="mobile"   name="mobile"   checked={p.mobile} />
        <label for="mobile">Mobile</label>
      </span>

      <TagInput label="Tags" name="tags" bind:values={tags} />
      <TagInput label="Compétences" name="skills" bind:values={skills} />

      <div class="button-wrap">
        <button type="submit">Enregistrer</button>
      </div>
    </form>

    <div class="doc-view">
      <FileSlot label="CV" kind="cv" stored={p.cv} endpoint={`/api/admin/files/${p.userId}/cv`} />
      <FileSlot label="Pièce d'identité (recto)" kind="id_doc" stored={p.idDoc} endpoint={`/api/admin/files/${p.userId}/id_doc`} />
      <FileSlot label="Pièce d'identité (verso)" kind="id_doc_verso" stored={p.idDocVerso} endpoint={`/api/admin/files/${p.userId}/id_doc_verso`} />
    </div>
  </div>
</div>

<style>
  .danger-btn { border-color: #b00020; color: #b00020; }
  .danger-btn:hover { background-color: #b00020; color: var(--primary); border-color: #b00020; }
</style>
