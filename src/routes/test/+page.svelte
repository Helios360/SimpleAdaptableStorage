<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import Alert from '$components/Alert.svelte';

  type Test = { id: number; question: string; type: number; difficulty: number };
  const TYPE_LABEL: Record<number, string> = { 1: 'Frontend', 2: 'Backend', 3: 'Psychotechnique' };

  let test = $state<Test | null>(null);
  let counter = $state(0);
  let answer = $state('');
  let busy = $state(false);
  let lastScore = $state<number | null>(null);
  let done = $state(false);
  let error = $state('');

  async function fetchNext() {
    busy = true; error = '';
    try {
      const res = await fetch('/api/test/next');
      if (!res.ok) throw new Error('Erreur de chargement');
      const data = await res.json();
      if (data.done) { done = true; setTimeout(() => goto('/profile'), 2500); return; }
      test = data.test; counter = data.count; answer = '';
    } catch (e) { error = (e as Error).message; }
    finally { busy = false; }
  }

  async function submit() {
    if (!test || !answer.trim()) return;
    busy = true; error = '';
    try {
      const res = await fetch('/api/test/response', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ testId: test.id, answer })
      });
      if (!res.ok) throw new Error('Erreur de soumission');
      const data = await res.json();
      lastScore = data.score;
      setTimeout(() => { lastScore = null; fetchNext(); }, 1200);
    } catch (e) { error = (e as Error).message; }
    finally { busy = false; }
  }

  onMount(fetchNext);
</script>

<svelte:head><title>Test de compétences</title><link rel="stylesheet" href="/styles/test.css" /></svelte:head>

<div class="page-narrow">
  <h1>Test de compétences</h1>
  <p class="muted">Répondez de la manière la plus précise possible. Votre score est automatique.</p>

  {#if error}<Alert kind="error">{error}</Alert>{/if}

  {#if done}
    <div class="container" style="text-align:center">
      <h2>Examen terminé !</h2>
      <p class="muted">Redirection vers votre profil…</p>
    </div>
  {:else if test}
    <article class="container">
      <div class="row between">
        <span>Question {counter}</span>
        <span class="chip">{TYPE_LABEL[test.type] ?? '?'} · niveau {test.difficulty}</span>
      </div>
      <h2>{test.question}</h2>
      <textarea
        rows="6"
        bind:value={answer}
        placeholder="Votre réponse…"
        disabled={busy || lastScore !== null}
      ></textarea>
      <div class="row between" style="margin-top:1rem">
        {#if lastScore !== null}
          <span class="chip active">Score : {lastScore}/100</span>
        {:else}<span></span>{/if}
        <button onclick={submit} disabled={busy || !answer.trim() || lastScore !== null}>
          {busy ? '…' : 'Valider'}
        </button>
      </div>
    </article>
  {:else}
    <div class="container" style="text-align:center">Chargement…</div>
  {/if}
</div>

<style>
  textarea{
    width: 100%;
    border: 2px solid var(--secondary);
    border-radius: 8px;
    padding: 0.6rem;
    background: transparent;
    color: var(--secondary);
    font-family: main-font;
    font-size: 1rem;
    resize: vertical;
  }
  h2 { font-weight: lighter; }
</style>
