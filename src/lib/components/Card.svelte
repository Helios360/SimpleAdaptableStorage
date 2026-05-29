<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		padding?: string;
		clickable?: boolean;
		children?: Snippet;
	}

	let { padding, clickable = false, children, class: klass = '', style = '', ...rest }: Props = $props();
</script>

<div
	class="cs-card {clickable ? 'cs-card--clickable' : ''} {klass}"
	style:padding
	style={style as string}
	{...rest}
>
	{#if children}{@render children()}{/if}
</div>

<style>
	.cs-card {
		background: var(--c-card);
		border-radius: 14px;
		border: 1px solid var(--c-border);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
	}
	.cs-card--clickable {
		cursor: pointer;
	}
</style>
