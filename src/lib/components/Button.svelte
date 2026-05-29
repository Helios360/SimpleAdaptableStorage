<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Variant = 'primary' | 'danger' | 'ghost' | 'subtle';
	type Size = 'sm' | 'md' | 'lg';

	interface Props extends HTMLButtonAttributes {
		variant?: Variant;
		size?: Size;
		icon?: string;
		fullWidth?: boolean;
		children?: Snippet;
	}

	let {
		variant = 'primary',
		size = 'md',
		icon,
		fullWidth = false,
		disabled,
		type = 'button',
		children,
		class: klass = '',
		...rest
	}: Props = $props();
</script>

<button
	{type}
	{disabled}
	class="cs-btn cs-btn--{variant} cs-btn--{size} {fullWidth ? 'cs-btn--full' : ''} {klass}"
	{...rest}
>
	{#if icon}<span class="cs-btn__icon">{icon}</span>{/if}
	{#if children}{@render children()}{/if}
</button>

<style>
	.cs-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		justify-content: flex-start;
		font-family: var(--font-body);
		font-weight: 600;
		border: none;
		cursor: pointer;
		transition: all 0.15s;
		user-select: none;
	}
	.cs-btn:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}
	.cs-btn--full {
		width: 100%;
		justify-content: center;
	}
	.cs-btn--sm {
		padding: 6px 12px;
		font-size: 12px;
		border-radius: 7px;
	}
	.cs-btn--md {
		padding: 9px 18px;
		font-size: 14px;
		border-radius: 9px;
	}
	.cs-btn--lg {
		padding: 13px 24px;
		font-size: 15px;
		border-radius: 11px;
	}
	.cs-btn--primary {
		background: var(--c-blue);
		color: #fff;
	}
	.cs-btn--primary:hover:not(:disabled) {
		background: var(--c-blue-dim);
	}
	.cs-btn--danger {
		background: var(--c-red);
		color: #fff;
	}
	.cs-btn--ghost {
		background: transparent;
		color: var(--c-blue);
		box-shadow: inset 0 0 0 1.5px var(--c-blue);
	}
	.cs-btn--subtle {
		background: var(--c-bg);
		color: var(--c-text);
	}
	.cs-btn__icon {
		font-size: 14px;
	}
</style>
