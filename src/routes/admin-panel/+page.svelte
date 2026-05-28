<script lang="ts">
  import { onMount } from 'svelte';
  import ChipGroup from '$components/ChipGroup.svelte';
  import TagInput from '$components/TagInput.svelte';

  let { data } = $props();

  type Row = {
    id: string;
    email: string;
    name: string; fname: string;
    city: string;
    status: 'active' | 'recherche' | 'entreprise' | 'archive';
    formation_code: string | null;
    formation_name: string | null;
    gen_score: number | null;
    tags: string[]; skills: string[];
    permis: boolean; vehicule: boolean; mobile: boolean;
    created_at: string;
  };

  let q = $state('');
  let city = $state('');
  let postal = $state('');
  let radius = $state<number | null>(null);
  let permis = $state(false);
  let vehicule = $state(false);
  let mobile = $state(false);
  let tags = $state<string[]>([]);
  let skills = $state<string[]>([]);
  let statusF = $state<string[]>([]);
  let yearF = $state<number[]>([]);
  let formationF = $state<number[]>([]);
  let order = $state<'name' | 'fname' | 'city' | 'status' | 'created_at' | 'gen_score'>('gen_score');
  let orderBy = $state<'ASC' | 'DESC'>('DESC');
  let pageSize = $state(20);
  let pageNum = $state(1);

  let rows = $state<Row[]>([]);
  let total = $state(0);
  let loading = $state(false);
  let timer: ReturnType<typeof setTimeout>;

  const totalPages = $derived(Math.max(1, Math.ceil(total / pageSize)));

  async function search() {
    loading = true;
    const body = {
      q, city, postal, radius, permis, vehicule, mobile,
      tags, skills, status: statusF, year: yearF, formation_id: formationF,
      order, orderBy, page: pageNum, pageSize
    };
    try {
      const res = await fetch('/api/admin/search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if (json.success) { rows = json.users; total = json.pagination.total; }
    } finally { loading = false; }
  }
  function debounced() { clearTimeout(timer); timer = setTimeout(search, 250); }

  $effect(() => {
    void q; void city; void postal; void radius;
    void permis; void vehicule; void mobile;
    void tags; void skills;
    void statusF; void yearF; void formationF;
    void order; void orderBy; void pageNum; void pageSize;
    debounced();
  });

  onMount(search);

  async function updateStatus(id: string, status: Row['status']) {
    await fetch('/api/admin/update-status', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, status })
    });
    rows = rows.map((r) => (r.id === id ? { ...r, status } : r));
  }
</script>

<svelte:head><title>Administration</title><link rel="stylesheet" href="/styles/admin.css" /></svelte:head>

<div class="inputInfo">
  <h2>Filtres</h2>

  <div>
    <label for="q">Recherche</label>
    <input class="inputs" id="q" type="text" placeholder="nom, prénom…" bind:value={q} />
  </div>

  <div class="place">
    <input class="inputs" type="text" placeholder="Ville" bind:value={city} />
    <input class="inputs" type="text" placeholder="CP" bind:value={postal} />
    <input class="inputs" type="number" min="0" placeholder="Rayon km" bind:value={radius} />
  </div>

  <ChipGroup
    label="Statut"
    bind:selected={statusF}
    options={[
      { value: 'recherche', label: 'En recherche' },
      { value: 'entreprise', label: 'En entreprise' },
      { value: 'active', label: 'Actif' },
      { value: 'archive', label: 'Archivé' }
    ]}
  />

  <ChipGroup
    label="Formation"
    bind:selected={formationF}
    options={data.formations.map((f) => ({ value: f.id, label: f.name }))}
  />

  <ChipGroup
    label="Année"
    bind:selected={yearF}
    options={[1, 2, 3].map((y) => ({ value: y, label: `Année ${y}` }))}
  />

  <span class="checks">
    <label><input type="checkbox" bind:checked={permis} /> Permis</label>
    <label><input type="checkbox" bind:checked={vehicule} /> Véhicule</label>
    <label><input type="checkbox" bind:checked={mobile} /> Mobile</label>
  </span>

  <TagInput label="Tags" name="tags" bind:values={tags} placeholder="tag…" />
  <TagInput label="Compétences" name="skills" bind:values={skills} placeholder="skill…" />

  <div class="place1">
    <select bind:value={order}>
      <option value="gen_score">Score</option>
      <option value="created_at">Inscription</option>
      <option value="name">Nom</option>
      <option value="fname">Prénom</option>
      <option value="city">Ville</option>
      <option value="status">Statut</option>
    </select>
    <select bind:value={orderBy}>
      <option value="DESC">↓</option>
      <option value="ASC">↑</option>
    </select>
  </div>
</div>

<div class="list">
  <div class="header">
    <p class="muted">{loading ? '…' : `${total} candidat${total > 1 ? 's' : ''}`}</p>
    <span>
      <select class="status-select" bind:value={pageSize}>
        {#each [10, 20, 50, 100] as n}<option value={n}>{n}/page</option>{/each}
      </select>
    </span>
  </div>

  {#each rows as r (r.id)}
    <div class="user">
      <span>
        <a href={`/admin-panel/u/${r.id}`}><strong>{r.fname} {r.name}</strong></a>
        <p class="formation-tag">{r.email} · {r.city || '—'} · {r.formation_name ?? '—'}</p>
        {#if r.skills?.length}
          <div class="chip-group" style="margin-top:.3rem">
            {#each r.skills.slice(0, 6) as s}<span class="chip">{s}</span>{/each}
          </div>
        {/if}
      </span>
      <span style="display:flex; gap:.5rem; align-items:center">
        {#if r.gen_score !== null}<span class="chip">{r.gen_score}/100</span>{/if}
        <select
          class="status-select"
          value={r.status}
          onchange={(e) => updateStatus(r.id, (e.currentTarget as HTMLSelectElement).value as Row['status'])}
        >
          <option value="recherche">Recherche</option>
          <option value="entreprise">Entreprise</option>
          <option value="active">Actif</option>
          <option value="archive">Archivé</option>
        </select>
      </span>
    </div>
  {:else}
    <p class="gugugaga">Aucun candidat trouvé.</p>
  {/each}

  <div class="pages">
    <button type="button" class="page-btn" disabled={pageNum <= 1} onclick={() => (pageNum -= 1)}>‹</button>
    <p>{pageNum} / {totalPages}</p>
    <button type="button" class="page-btn" disabled={pageNum >= totalPages} onclick={() => (pageNum += 1)}>›</button>
  </div>

<style>
  /* Page-nav buttons: thin square instead of the global 330x50. */
  .page-btn{ width: auto; height: auto; padding: 0.2rem 0.8rem 0.4rem 0.8rem; font-size: 1.5rem; }
</style>
</div>
