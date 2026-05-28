<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { authClient } from '$lib/auth-client';
  import Alert from '$components/Alert.svelte';

  const token = $derived($page.url.searchParams.get('token'));

  let email = $state('');
  let password = $state('');
  let busy = $state(false);
  let info = $state('');
  let error = $state('');

  async function requestReset(e: SubmitEvent) {
    e.preventDefault();
    busy = true; info = ''; error = '';
    const res = await authClient.requestPasswordReset({
      email: email.trim(),
      redirectTo: `${location.origin}/reset-password`
    });
    busy = false;
    if (res.error) error = res.error.message || 'Erreur';
    else info = 'Si l\'adresse existe, un lien a été envoyé.';
  }

  async function confirmReset(e: SubmitEvent) {
    e.preventDefault();
    if (!token) return;
    busy = true; info = ''; error = '';
    const res = await authClient.resetPassword({ newPassword: password, token });
    busy = false;
    if (res.error) error = res.error.message || 'Lien invalide ou expiré';
    else { info = 'Mot de passe mis à jour. Redirection…'; setTimeout(() => goto('/signin'), 1500); }
  }
</script>

<svelte:head><title>Mot de passe oublié</title></svelte:head>

<img class="logo-hero" src="/sources/LogoBleuOmbre-edited.png" alt="Logo" />

{#if token}
  <h1>Nouveau mot de passe</h1>
  <form class="form" onsubmit={confirmReset} novalidate>
    <div class="signin">
      {#if error}<Alert kind="error">{error}</Alert>{/if}
      {#if info}<Alert kind="success">{info}</Alert>{/if}
      <input class="inputs" type="password" placeholder="Nouveau mot de passe . . ." autocomplete="new-password" required bind:value={password} />
      <button type="submit" disabled={busy}>{busy ? '…' : 'Définir'}</button>
    </div>
  </form>
{:else}
  <h1>Mot de passe oublié</h1>
  <form class="form" onsubmit={requestReset} novalidate>
    <div class="signin">
      {#if error}<Alert kind="error">{error}</Alert>{/if}
      {#if info}<Alert kind="success">{info}</Alert>{/if}
      <input class="inputs" type="email" placeholder="Email . . ." autocomplete="email" required bind:value={email} />
      <button type="submit" disabled={busy}>{busy ? '…' : 'Envoyer le lien'}</button>
      <span><a href="/signin"><u>Retour à la connexion</u></a></span>
    </div>
  </form>
{/if}
