<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		open: boolean;
		onclose: () => void;
		title: string;
		width?: number;
		children?: Snippet;
	}

	let { open, onclose, title, width = 480, children }: Props = $props();

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}

	function onBackdrop(e: MouseEvent) {
		if (e.target === e.currentTarget) onclose();
	}
</script>

<svelte:window on:keydown={onKey} />

{#if open}
	<div
		class="cs-modal__backdrop"
		role="presentation"
		onclick={onBackdrop}
		onkeydown={(e) => e.key === 'Escape' && onclose()}
	>
		<div
			role="dialog"
			aria-modal="true"
			aria-label={title}
			tabindex="-1"
			class="cs-modal__panel"
			style:max-width="{width}px"
		>
			<div class="cs-modal__head">
				<h2 class="cs-modal__title">{title}</h2>
				<button class="cs-modal__close" aria-label="Fermer" onclick={onclose}>×</button>
			</div>
			{#if children}{@render children()}{/if}
		</div>
	</div>
{/if}

<style>
	.cs-modal__backdrop {
		position: fixed;
		inset: 0;
		background: rgba(11, 22, 40, 0.55);
		z-index: 1000;
		display: grid;
		place-items: center;
		padding: 16px;
		animation: cs-fade 0.2s ease;
	}
	.cs-modal__panel {
		background: var(--c-card);
		border-radius: 16px;
		padding: 28px;
		width: 100%;
		outline: none;
		box-shadow: 0 24px 80px rgba(0, 0, 0, 0.25);
		max-height: 90vh;
		overflow-y: auto;
		animation: cs-pop 0.22s ease;
	}
	.cs-modal__head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		margin-bottom: 20px;
	}
	.cs-modal__title {
		font-family: var(--font-display);
		font-size: 18px;
		font-weight: 800;
		color: var(--c-text);
		min-width: 0;
		overflow-wrap: anywhere;
	}
	.cs-modal__close {
		background: none;
		border: none;
		font-size: 22px;
		cursor: pointer;
		color: var(--c-muted);
		line-height: 1;
		flex-shrink: 0;
	}
	@media (max-width: 540px) {
		.cs-modal__backdrop {
			padding: 8px;
			place-items: end center;
		}
		.cs-modal__panel {
			padding: 20px;
			border-radius: 14px;
			max-height: 94vh;
		}
		.cs-modal__title {
			font-size: 16px;
		}
	}
</style>
