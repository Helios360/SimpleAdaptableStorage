<script lang="ts">
  import { invalidateAll } from '$app/navigation';

  type Props = {
    label: string;
    kind: 'cv' | 'id_doc' | 'id_doc_verso' | 'video';
    stored: string | null;
    /** Upload URL — POST multipart with `file`; DELETE removes. */
    endpoint?: string;
  };
  let { label, kind, stored, endpoint = `/api/files/${kind}` }: Props = $props();
  const isVideo = $derived(kind === 'video');
  const accept = $derived(
    kind === 'video'
      ? 'video/mp4,video/webm,video/quicktime,video/x-m4v'
      : kind === 'cv'
        ? 'application/pdf'
        : '.pdf,image/jpeg,image/png'
  );
  let busy = $state(false);
  let error = $state('');

  async function upload(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    error = ''; busy = true;
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(endpoint, { method: 'POST', body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Échec du téléversement');
      }
      await invalidateAll();
    } catch (e) {
      error = (e as Error).message;
    } finally {
      busy = false;
      input.value = '';
    }
  }

  async function remove() {
    if (!confirm('Supprimer ce fichier ?')) return;
    busy = true; error = '';
    try {
      const res = await fetch(endpoint, { method: 'DELETE' });
      if (!res.ok) throw new Error('Échec de la suppression');
      await invalidateAll();
    } catch (e) {
      error = (e as Error).message;
    } finally {
      busy = false;
    }
  }

  const viewUrl = $derived(stored ? endpoint : null);
</script>

<div class="container">
  <div class="row between">
    <strong>{label}</strong>
    <span class="muted small">{stored ? 'Présent' : 'Absent'}</span>
  </div>

  {#if viewUrl}
    {#if isVideo}
      <!-- svelte-ignore a11y_media_has_caption -->
      <video src={viewUrl} controls preload="metadata"></video>
    {:else}
      <iframe src={viewUrl} title={label}></iframe>
    {/if}
  {/if}

  <div class="row">
    <label class="file-upload-btn">
      <input class="hidden-file" type="file" {accept} onchange={upload} disabled={busy} />
      {stored ? 'Remplacer' : 'Téléverser'}
    </label>
    {#if stored}
      <button type="button" class="del" onclick={remove} disabled={busy}>Supprimer</button>
    {/if}
  </div>

  {#if error}<p class="small danger">{error}</p>{/if}
</div>

<style>
  /* The component's iframe should match the original CSS profile.css iframe rule */
  iframe { width: 100%; min-height: 320px; border-radius: 8px; border: 2px solid var(--secondary); margin-top: 0.5rem; }
  video { width: 100%; max-height: 480px; border-radius: 8px; border: 2px solid var(--secondary); margin-top: 0.5rem; background: black; }
  .hidden-file { display: none; }
  .file-upload-btn{
    display: inline-flex; align-items: center; justify-content: center;
    height: 40px; padding: 0 1rem;
    border: 2px solid var(--secondary); border-radius: 8px;
    cursor: pointer; font-size: 1rem;
  }
  .del { width: auto; height: 40px; padding: 0 1rem; font-size: 1rem; border-color: #b00020; color: #b00020; }
  .del:hover { background-color: #b00020; color: var(--primary); border-color: #b00020; }
  .container { display: flex; flex-direction: column; gap: 0.5rem; }
</style>
