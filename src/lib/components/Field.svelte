<script lang="ts">
  type Props = {
    label: string;
    name: string;
    value?: string | number | null;
    type?: string;
    required?: boolean;
    placeholder?: string;
    autocomplete?: import('svelte/elements').FullAutoFill;
    hint?: string;
    error?: string;
  };
  let {
    label,
    name,
    value = $bindable(''),
    type = 'text',
    required = false,
    placeholder = '',
    autocomplete,
    hint,
    error
  }: Props = $props();
</script>

<div>
  <label for={name}>{label}{#if required} *{/if}</label>
  <input
    id={name}
    class="inputs"
    {type}
    {name}
    {required}
    {placeholder}
    {autocomplete}
    bind:value
  />
  {#if error}<p class="small danger">{error}</p>{:else if hint}<p class="small muted">{hint}</p>{/if}
</div>
