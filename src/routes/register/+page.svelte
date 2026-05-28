<script lang="ts">
  import { goto } from '$app/navigation';
  import Alert from '$components/Alert.svelte';

  let { data } = $props();

  // --- City autocomplete + postal auto-fill via geo.api.gouv.fr -----------
  type Commune = { nom: string; code: string; codesPostaux: string[] };
  let city = $state('');
  let postal = $state('');
  let suggestions = $state<Commune[]>([]);
  let cityTimer: ReturnType<typeof setTimeout>;

  function onCityInput() {
    clearTimeout(cityTimer);
    const q = city.trim();
    if (q.length < 2) { suggestions = []; return; }
    cityTimer = setTimeout(async () => {
      try {
        const r = await fetch(
          `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(q)}&boost=population&fields=codesPostaux&limit=10`,
          { signal: AbortSignal.timeout(3000) }
        );
        if (r.ok) suggestions = (await r.json()) as Commune[];
      } catch { /* ignore */ }
    }, 200);
  }

  function onCityChange() {
    const match = suggestions.find((s) => s.nom.toLowerCase() === city.trim().toLowerCase());
    if (match?.codesPostaux?.[0] && !postal) postal = match.codesPostaux[0];
  }

  // --- File slots -----------------------------------------------------------
  let cvInput!: HTMLInputElement;
  let idrInput: HTMLInputElement | undefined = $state();
  let idvInput: HTMLInputElement | undefined = $state();
  let cvName = $state<string | null>(null);
  let idrName = $state<string | null>(null);
  let idvName = $state<string | null>(null);

  function pick(e: Event, set: (v: string | null) => void) {
    set((e.currentTarget as HTMLInputElement).files?.[0]?.name ?? null);
  }
  function clear(input: HTMLInputElement | undefined, set: (v: string | null) => void) {
    if (input) input.value = '';
    set(null);
  }

  // --- Titre de séjour toggle ----------------------------------------------
  let sejour = $state(false);

  // --- Password fields + visibility + match --------------------------------
  let pwdShown = $state(false);
  let confShown = $state(false);
  let password = $state('');
  let confirmPwd = $state('');
  const pwdMatch = $derived(confirmPwd === '' ? null : password === confirmPwd);

  // --- Phone: strip spaces as user types ------------------------------------
  let tel = $state('');
  function onTelInput() { tel = tel.replace(/\s+/g, ''); }

  // --- Validation -----------------------------------------------------------
  const reName = /^[A-Za-zÀ-ÖØ-öø-ÿ\s\-]+$/;
  const reEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const rePhone = /^0[1-9][0-9]{8}$/;
  const rePostal = /^(0[1-9]|[1-8][0-9]|9[0-8])[0-9]{3}$/;

  function isAdult(d: string) {
    if (!d) return false;
    const b = new Date(d), t = new Date();
    let age = t.getFullYear() - b.getFullYear();
    const m = t.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age--;
    return age >= 18;
  }
  function validFile(input: HTMLInputElement | undefined, exts: string[], maxMB: number) {
    const f = input?.files?.[0];
    if (!f) return false;
    const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
    if (!exts.includes(ext)) return false;
    return f.size > 0 && f.size <= maxMB * 1024 * 1024;
  }

  // --- Submit ---------------------------------------------------------------
  let busy = $state(false);
  let error = $state('');
  let success = $state(false);

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    error = '';
    const form = e.target as HTMLFormElement;
    const errs: string[] = [];

    const name = form.querySelector<HTMLInputElement>('#name')?.value.trim() ?? '';
    const fname = form.querySelector<HTMLInputElement>('#fname')?.value.trim() ?? '';
    const email = form.querySelector<HTMLInputElement>('#email')?.value.trim() ?? '';
    const birth = form.querySelector<HTMLInputElement>('#birth')?.value ?? '';
    const titre = form.querySelector<HTMLInputElement>('#titre-sejour')?.value ?? '';

    if (!reName.test(name)) errs.push('Nom invalide (lettres uniquement).');
    if (!reName.test(fname)) errs.push('Prénom invalide (lettres uniquement).');
    if (!reEmail.test(email)) errs.push('Email invalide.');
    if (!rePhone.test(tel)) errs.push('Téléphone invalide (10 chiffres).');
    if (!city.trim()) errs.push('Ville obligatoire.');
    if (postal && !rePostal.test(postal.replace(/\s+/g, ''))) errs.push('Code postal invalide (5 chiffres).');
    if (!isAdult(birth)) errs.push('Vous devez avoir au moins 18 ans.');
    if (sejour && !titre) errs.push("Date d'invalidité du titre de séjour obligatoire.");
    if (!validFile(cvInput, ['pdf'], 2)) errs.push('CV invalide ou manquant (PDF, max 2 Mo).');
    if (!validFile(idrInput, ['jpg', 'jpeg', 'png', 'pdf'], 3)) errs.push("Pièce d'identité recto invalide (JPG/PNG/PDF, max 3 Mo).");
    if (!validFile(idvInput, ['jpg', 'jpeg', 'png', 'pdf'], 3)) errs.push("Pièce d'identité verso invalide (JPG/PNG/PDF, max 3 Mo).");
    if (password.length < 8) errs.push('Mot de passe trop court (8 caractères minimum).');
    if (password !== confirmPwd) errs.push('Les mots de passe ne correspondent pas.');
    if (!form.querySelector<HTMLInputElement>('#consent')?.checked) {
      errs.push("Vous devez accepter les conditions d'utilisation.");
    }

    if (errs.length) {
      error = errs.join(' ');
      return;
    }

    busy = true;
    try {
      const res = await fetch('/api/register', { method: 'POST', body: new FormData(form) });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.message || 'Inscription impossible');
      success = true;
      setTimeout(() => goto('/'), 1500);
    } catch (e) {
      error = (e as Error).message;
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head><title>Inscription</title></svelte:head>

<div class="register-wrap">
  {#if error}<Alert kind="error">{error}</Alert>{/if}
  {#if success}<Alert kind="success">Compte créé. Redirection…</Alert>{/if}

  <form class="form" onsubmit={submit} enctype="multipart/form-data" novalidate>
    <!-- LEFT COLUMN --------------------------------------------------------->
    <div class="register">
      <div>
        <label for="formation_id">Formation *</label>
        <select id="formation_id" name="formation_id" required>
          <option value="" disabled selected>— Choisir —</option>
          {#each data.formations as f}<option value={f.id}>{f.name}</option>{/each}
        </select>
      </div>

      <div><label for="name">Nom *</label><input class="inputs" type="text" id="name" name="name" required /></div>
      <div><label for="fname">Prénom *</label><input class="inputs" type="text" id="fname" name="fname" required /></div>
      <div><label for="email">Email *</label><input class="inputs" type="email" id="email" name="email" autocomplete="email" required /></div>
      <div>
        <label for="tel">Téléphone *</label>
        <input class="inputs" type="tel" id="tel" name="tel" required bind:value={tel} oninput={onTelInput} />
      </div>
      <div><label for="addr">Adresse</label><input class="inputs" type="text" id="addr" name="addr" autocomplete="street-address" /></div>

      <div>
        <label for="city">Ville *</label>
        <input
          class="inputs"
          type="text"
          id="city"
          name="city"
          list="city-options"
          autocomplete="address-level2"
          required
          bind:value={city}
          oninput={onCityInput}
          onchange={onCityChange}
        />
        <datalist id="city-options">
          {#each suggestions as s (s.code)}
            <option value={s.nom}>{s.codesPostaux?.[0] ?? ''}</option>
          {/each}
        </datalist>
      </div>

      <div>
        <label for="postal">Code postal</label>
        <input class="inputs" type="text" id="postal" name="postal" autocomplete="postal-code" bind:value={postal} />
      </div>

      <div><label for="birth">Date de naissance *</label><input class="inputs" type="date" id="birth" name="birth" required /></div>
    </div>

    <hr />

    <!-- RIGHT COLUMN -------------------------------------------------------->
    <div class="register">
      <p class="docs-label">Documents :</p>
      <div class="form2">
        <div class="file-upload">
          <label for="cv">{cvName ?? 'CV (.pdf) *'}</label>
          {#if cvName}<button type="button" class="supprFile" onclick={() => clear(cvInput, (v) => (cvName = v))}>×</button>{/if}
          <input bind:this={cvInput} type="file" id="cv" name="cv" accept=".pdf"
                 onchange={(e) => pick(e, (v) => (cvName = v))} />
        </div>

        <span class="checks left">
          <input type="checkbox" id="sejour" name="sejour" bind:checked={sejour} />
          <label for="sejour">J'ai un titre de séjour plutôt qu'une pièce d'identité</label>
        </span>

        {#if !sejour}
          <div class="file-upload">
            <label for="id_doc">{idrName ?? "Pièce d'identité (recto) .png/.jpg/.pdf *"}</label>
            {#if idrName}<button type="button" class="supprFile" onclick={() => clear(idrInput, (v) => (idrName = v))}>×</button>{/if}
            <input bind:this={idrInput} type="file" id="id_doc" name="id_doc" accept=".png,.jpg,.jpeg,.pdf"
                   onchange={(e) => pick(e, (v) => (idrName = v))} />
          </div>
          <div class="file-upload">
            <label for="id_doc_verso">{idvName ?? "Pièce d'identité (verso) .png/.jpg/.pdf *"}</label>
            {#if idvName}<button type="button" class="supprFile" onclick={() => clear(idvInput, (v) => (idvName = v))}>×</button>{/if}
            <input bind:this={idvInput} type="file" id="id_doc_verso" name="id_doc_verso" accept=".png,.jpg,.jpeg,.pdf"
                   onchange={(e) => pick(e, (v) => (idvName = v))} />
          </div>
        {:else}
          <div class="sub-titre">
            <div>
              <label for="titre-sejour">Date d'invalidité du titre de séjour *</label>
              <input class="inputs" type="date" id="titre-sejour" name="titre" />
            </div>
            <div class="file-upload">
              <label for="id_doc">{idrName ?? 'Titre de séjour (recto) .png/.jpg/.pdf *'}</label>
              {#if idrName}<button type="button" class="supprFile" onclick={() => clear(idrInput, (v) => (idrName = v))}>×</button>{/if}
              <input bind:this={idrInput} type="file" id="id_doc" name="id_doc" accept=".png,.jpg,.jpeg,.pdf"
                     onchange={(e) => pick(e, (v) => (idrName = v))} />
            </div>
            <div class="file-upload">
              <label for="id_doc_verso">{idvName ?? 'Titre de séjour (verso) .png/.jpg/.pdf *'}</label>
              {#if idvName}<button type="button" class="supprFile" onclick={() => clear(idvInput, (v) => (idvName = v))}>×</button>{/if}
              <input bind:this={idvInput} type="file" id="id_doc_verso" name="id_doc_verso" accept=".png,.jpg,.jpeg,.pdf"
                     onchange={(e) => pick(e, (v) => (idvName = v))} />
            </div>
          </div>
        {/if}
      </div>

      <div class="check-list">
        <span class="checks left"><input type="checkbox" id="permis" name="permis" /><label for="permis">Permis B</label></span>
        <span class="checks left"><input type="checkbox" id="vehicule" name="vehicule" /><label for="vehicule">Véhiculé</label></span>
        <span class="checks left"><input type="checkbox" id="mobile" name="mobile" /><label for="mobile">Mobile géographiquement</label></span>
      </div>

      <div>
        <label for="password">Mot de passe *</label>
        <span class="eye-contain">
          <input class="inputs" type={pwdShown ? 'text' : 'password'} id="password" name="password"
                 autocomplete="new-password" required bind:value={password} />
          <button type="button" class="eye-btn" aria-label="Afficher le mot de passe"
                  onclick={() => (pwdShown = !pwdShown)}>
            {#if pwdShown}
              <svg class="eye" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                <line x1="2" y1="2" x2="22" y2="22" />
              </svg>
            {:else}
              <svg class="eye" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            {/if}
          </button>
        </span>
      </div>

      <div>
        <label for="confirm">Confirmer le mot de passe *</label>
        <span class="eye-contain">
          <input class="inputs" type={confShown ? 'text' : 'password'} id="confirm" name="confirm"
                 autocomplete="new-password" required bind:value={confirmPwd} />
          <button type="button" class="eye-btn" aria-label="Afficher le mot de passe"
                  onclick={() => (confShown = !confShown)}>
            {#if confShown}
              <svg class="eye" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                <line x1="2" y1="2" x2="22" y2="22" />
              </svg>
            {:else}
              <svg class="eye" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            {/if}
          </button>
        </span>
      </div>

      {#if pwdMatch !== null}
        <span id="password-message" class:ok={pwdMatch} class:bad={!pwdMatch}>
          {pwdMatch ? '✔️ Les mots de passe correspondent' : '❌ Les mots de passe ne correspondent pas'}
        </span>
      {/if}

      <div class="checkbox">
        <label for="consent"><u>J'accepte les conditions d'utilisation.</u></label>
        <input type="checkbox" id="consent" name="consent" required />
      </div>

      <button type="submit" id="send" disabled={busy}>{busy ? '…' : 'Envoyer'}</button>
      <a href="/"><u>Vous avez déjà un compte ?</u></a>
    </div>
  </form>
</div>
