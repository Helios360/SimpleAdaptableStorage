<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		icon?: string;
		title: string;
		sub?: string;
		action?: Snippet;
	}

	let { icon = '📭', title, sub, action }: Props = $props();
</script>

<div class="cs-empty">
	<div class="cs-empty__icon">{icon}</div>
	<p class="cs-empty__title">{title}</p>
	{#if sub}<p class="cs-empty__sub" class:has-action={!!action}>{sub}</p>{/if}
	{#if action}{@render action()}{/if}
</div>

<style>
	.cs-empty {
		text-align: center;
		padding: 60px 24px;
		color: var(--c-muted);
	}
	.cs-empty__icon {
		font-size: 40px;
		margin-bottom: 12px;
	}
	.cs-empty__title {
		font-family: var(--font-display);
		font-weight: 700;
		font-size: 15px;
		color: var(--c-sub);
		margin-bottom: 6px;
	}
	.cs-empty__sub {
		font-size: 13px;
	}
	.cs-empty__sub.has-action {
		margin-bottom: 20px;
	}
</style>
