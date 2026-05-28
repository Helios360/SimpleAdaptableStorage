<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { authClient } from '$lib/auth-client';
  import Alert from '$components/Alert.svelte';

  let email = $state('');
  let password = $state('');
  let busy = $state(false);
  let error = $state('');

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    busy = true; error = '';
    const res = await authClient.signIn.email({ email: email.trim(), password });
    busy = false;
    if (res.error) { error = res.error.message || 'Identifiants invalides'; return; }
    const next = $page.url.searchParams.get('next') || '/profile';
    goto(next, { invalidateAll: true });
  }
</script>

<svelte:head><title>Connexion</title></svelte:head>

<img class="logo-hero" src="/sources/LogoBleuOmbre-edited.png" alt="Logo" />

<form class="form" onsubmit={submit} novalidate>
  <div class="signin">
    {#if error}<Alert kind="error">{error}</Alert>{/if}

    <input class="inputs" type="email" placeholder="Email . . ." autocomplete="email" required bind:value={email} />
    <input class="inputs" type="password" placeholder="Mot de passe . . ." autocomplete="current-password" required bind:value={password} />
    <button type="submit" disabled={busy}>{busy ? '…' : 'Envoyer'}</button>
    <span>
      <a href="/register"><u>Créer un compte</u></a>
      <a href="/reset-password"><u>Mot de passe oublié ?</u></a>
    </span>
  </div>
</form>
