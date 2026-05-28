<script lang="ts">
  type Props = {
    kind?: 'info' | 'success' | 'error' | 'warn';
    children?: import('svelte').Snippet;
  };
  let { kind = 'info', children }: Props = $props();
  const cls = { info: '', success: 'alert-success', error: 'alert-error', warn: 'alert-warn' } as const;
</script>

<div class="alert {cls[kind]}" role={kind === 'error' ? 'alert' : 'status'}>
  {@render children?.()}
</div>
