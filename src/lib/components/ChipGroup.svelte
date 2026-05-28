<script lang="ts" generics="T extends string | number">
  type Option = { value: T; label: string };
  type Props = {
    label: string;
    options: Option[];
    selected: T[];
  };
  let { label, options, selected = $bindable([]) }: Props = $props();

  function toggle(v: T) {
    selected = selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v];
  }
</script>

<div>
  <p class="small">{label}</p>
  <div class="chip-group">
    {#each options as opt}
      <button
        type="button"
        class="chip"
        class:active={selected.includes(opt.value)}
        onclick={() => toggle(opt.value)}
      >
        {opt.label}
      </button>
    {/each}
  </div>
</div>

<style>
  /* Override the global 330x50 button look — chips should be tiny pills. */
  button.chip { width: auto; height: auto; font-size: 0.9rem; }
</style>
