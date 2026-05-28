<script lang="ts">
  import { enhance } from '$app/forms';
  import TagInput from '$components/TagInput.svelte';
  import FileSlot from '$components/FileSlot.svelte';
  import Alert from '$components/Alert.svelte';

  let { data, form } = $props();

  let skills = $state<string[]>(data.profile.skills ?? []);
  let saving = $state(false);

  const formationName = $derived(
    data.formations.find((f) => f.id === data.profile.formationId)?.name ?? '—'
  );
</script>

<svelte:head><title>Mon profil</title><link rel="stylesheet" href="/styles/profile.css" /></svelte:head>

<div class="page">
  <div class="row between">
    <div>
      <h1>Mon profil</h1>
      <p class="muted">Formation : <strong>{formationName}</strong></p>
    </div>
    {#if !data.profile.consent}
      <form method="POST" action="?/consent" use:enhance>
        <button>Donner mon consentement</button>
      </form>
    {/if}
  </div>

  {#if form?.success}<Alert kind="success">Profil mis à jour.</Alert>{/if}
  {#if form?.message}<Alert kind="error">{form.message}</Alert>{/if}

  <div class="contain">
    <form
      class="info-view"
      method="POST"
      action="?/update"
      use:enhance={() => {
        saving = true;
        return async ({ update }) => { await update(); saving = false; };
      }}
    >
      <ul class="info-list">
        <li><label for="fname">Prénom</label><input class="inputs" id="fname" name="fname" required value={data.profile.fname} /></li>
        <li><label for="name">Nom</label><input class="inputs" id="name" name="name" required value={data.profile.name} /></li>
        <li><label for="tel">Téléphone</label><input class="inputs" id="tel" name="tel" type="tel" required value={data.profile.tel} /></li>
        <li><label for="birth">Naissance</label><input class="inputs" id="birth" name="birth" type="date" value={data.profile.birth ?? ''} /></li>
        <li><label for="addr">Adresse</label><input class="inputs" id="addr" name="addr" value={data.profile.addr ?? ''} /></li>
        <li>
          <label for="city">Ville</label>
          <div class="city-postal">
            <input class="inputs" id="city" name="city" required value={data.profile.city} />
            <input class="inputs" id="postal" name="postal" placeholder="CP" value={data.profile.postal ?? ''} />
          </div>
        </li>
      </ul>

      <span class="checks">
        <input type="checkbox" id="permis"   name="permis"   checked={data.profile.permis} />
        <label for="permis">Permis</label>
        <input type="checkbox" id="vehicule" name="vehicule" checked={data.profile.vehicule} />
        <label for="vehicule">Véhicule</label>
        <input type="checkbox" id="mobile"   name="mobile"   checked={data.profile.mobile} />
        <label for="mobile">Mobile</label>
      </span>

      <TagInput label="Compétences" name="skills" bind:values={skills} placeholder="Ex: JavaScript" />

      <div class="button-wrap">
        <button type="submit" disabled={saving}>{saving ? '…' : 'Enregistrer'}</button>
      </div>
    </form>

    <div class="doc-view">
      <FileSlot label="CV" kind="cv" stored={data.profile.cv} />
      <FileSlot label="Pièce d'identité (recto)" kind="id_doc" stored={data.profile.idDoc} />
      <FileSlot label="Pièce d'identité (verso)" kind="id_doc_verso" stored={data.profile.idDocVerso} />

      <form method="POST" action="?/delete" use:enhance>
        <button
          id="deleteBtn"
          type="submit"
          onclick={(e) => { if (!confirm('Confirmer la suppression du compte ?')) e.preventDefault(); }}
        >
          Supprimer mon compte
        </button>
      </form>
    </div>
  </div>
</div>
