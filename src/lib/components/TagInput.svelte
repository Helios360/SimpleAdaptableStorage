<script lang="ts">
  type Props = {
    label: string;
    name: string;
    values: string[];
    placeholder?: string;
  };
  let { label, name, values = $bindable([]), placeholder = 'Ajouter…' }: Props = $props();
  let draft = $state('');

  function add() {
    const v = draft.trim();
    if (!v) return;
    if (!values.includes(v)) values = [...values, v];
    draft = '';
  }
  function remove(i: number) {
    values = values.filter((_, j) => j !== i);
  }
  function onKey(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); }
    else if (e.key === 'Backspace' && !draft && values.length) values = values.slice(0, -1);
  }
</script>

<div>
  <label for={`${name}-input`}>{label}</label>
  <div class="taging">
    {#each values as v, i}
      <span class="chip active">
        {v}
        <button type="button" onclick={() => remove(i)} aria-label="Retirer {v}">×</button>
      </span>
    {/each}
    <input id={`${name}-input`} bind:value={draft} onkeydown={onKey} onblur={add} {placeholder} />
  </div>
  <input type="hidden" {name} value={JSON.stringify(values)} />
</div>
