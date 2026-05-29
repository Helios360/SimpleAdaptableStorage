<script lang="ts">
	import { toastStore } from '$lib/stores/toast.svelte';
	const toasts = toastStore();
</script>

<div class="cs-toasts" aria-live="polite">
	{#each toasts as t (t.id)}
		<div class="cs-toast cs-toast--{t.type}">
			<span class="cs-toast__icon">
				{#if t.type === 'success'}✓{:else if t.type === 'error'}✕{:else}ⓘ{/if}
			</span>
			{t.msg}
		</div>
	{/each}
</div>

<style>
	.cs-toasts {
		position: fixed;
		bottom: 24px;
		right: 24px;
		z-index: 9999;
		display: flex;
		flex-direction: column;
		gap: 8px;
		pointer-events: none;
	}
	.cs-toast {
		color: #fff;
		padding: 12px 18px;
		border-radius: 10px;
		font-size: 14px;
		font-weight: 500;
		box-shadow: 0 8px 28px rgba(0, 0, 0, 0.22);
		display: flex;
		align-items: center;
		gap: 10px;
		animation: cs-slide-in 0.25s ease;
	}
	.cs-toast--success {
		background: var(--c-green);
	}
	.cs-toast--error {
		background: var(--c-red);
	}
	.cs-toast--info {
		background: var(--c-blue);
	}
	.cs-toast__icon {
		font-size: 16px;
	}
</style>
