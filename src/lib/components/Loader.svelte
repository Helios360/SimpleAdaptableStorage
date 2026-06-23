<script lang="ts">
	interface Props {
		/** Diamètre du spinner en px */
		size?: number;
		/** Libellé optionnel affiché sous le spinner */
		label?: string;
		/** Centre le loader sur toute la largeur disponible (bloc) */
		block?: boolean;
		/** Couleur de l'arc actif (défaut : couleur de marque) */
		color?: string;
	}

	let { size = 28, label, block = false, color = 'var(--c-blue)' }: Props = $props();
</script>

<div class="cs-loader" class:cs-loader--block={block} role="status" aria-live="polite">
	<span
		class="cs-loader__spin"
		style:width="{size}px"
		style:height="{size}px"
		style:border-top-color={color}
	></span>
	{#if label}<span class="cs-loader__label">{label}</span>{/if}
</div>

<style>
	.cs-loader {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		color: var(--c-muted);
		font-size: 13px;
	}
	.cs-loader--block {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		gap: 12px;
		width: 100%;
		padding: 32px 16px;
	}
	.cs-loader__spin {
		display: inline-block;
		border: 2.5px solid var(--c-border);
		border-radius: 50%;
		animation: cs-loader-spin 0.7s linear infinite;
		flex-shrink: 0;
	}
	.cs-loader__label {
		font-weight: 600;
	}
	@keyframes cs-loader-spin {
		to {
			transform: rotate(360deg);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.cs-loader__spin {
			animation-duration: 1.6s;
		}
	}
</style>
