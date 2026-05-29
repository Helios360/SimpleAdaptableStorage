<script lang="ts">
	import { theme } from '$lib/stores/theme.svelte';
	import Logo from './Logo.svelte';

	interface Notif {
		icon: string;
		text: string;
	}

	interface Props {
		title: string;
		onmenuclick: () => void;
		isMobile: boolean;
		notifications?: Notif[];
		onclearnotifs?: () => void;
	}

	let { title, onmenuclick, isMobile, notifications = [], onclearnotifs }: Props = $props();
	let open = $state(false);
	const t = theme();
</script>

<div class="cs-top" class:cs-top--mobile={isMobile}>
	{#if isMobile}
		<button class="cs-top__menu" aria-label="Menu" onclick={onmenuclick}>☰</button>
	{/if}
	<a href="/" class="cs-top__brand" aria-label="Accueil">
		<Logo size={32} variant="light" showText={!isMobile} />
	</a>
	<span class="cs-top__sep" aria-hidden="true"></span>
	<span class="cs-top__title">{title}</span>
	<button
		class="cs-top__theme"
		aria-label={t.value === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}
		title={t.value === 'dark' ? 'Mode clair' : 'Mode sombre'}
		onclick={() => t.toggle()}
	>
		{t.value === 'dark' ? '☀️' : '🌙'}
	</button>
	<div class="cs-top__bell">
		<button class="cs-top__bell-btn" aria-label="Notifications" onclick={() => (open = !open)}>
			🔔
			{#if notifications.length > 0}
				<span class="cs-top__bell-count">{notifications.length}</span>
			{/if}
		</button>
		{#if open}
			<div class="cs-top__menu-panel">
				<div class="cs-top__menu-head">
					<span>Notifications</span>
					{#if notifications.length > 0 && onclearnotifs}
						<button
							class="cs-top__menu-clear"
							onclick={() => {
								onclearnotifs?.();
								open = false;
							}}>Tout effacer</button
						>
					{/if}
				</div>
				{#if notifications.length === 0}
					<div class="cs-top__menu-empty">Aucune notification</div>
				{:else}
					{#each notifications as n}
						<div class="cs-top__menu-item">
							<span>{n.icon}</span><span>{n.text}</span>
						</div>
					{/each}
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.cs-top {
		background: var(--c-navy);
		padding: 14px 32px;
		display: flex;
		align-items: center;
		gap: 12px;
		position: sticky;
		top: 0;
		z-index: 800;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}
	.cs-top--mobile {
		padding: 14px 18px;
	}
	.cs-top__menu {
		background: none;
		border: none;
		color: #fff;
		font-size: 22px;
		cursor: pointer;
		line-height: 1;
	}
	.cs-top__brand {
		display: inline-flex;
		align-items: center;
		text-decoration: none;
		flex-shrink: 0;
	}
	.cs-top__sep {
		width: 1px;
		align-self: stretch;
		background: rgba(255, 255, 255, 0.18);
		margin: 0 4px;
	}
	.cs-top__title {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 16px;
		color: #fff;
		flex: 1;
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.cs-top__theme {
		background: none;
		border: none;
		cursor: pointer;
		font-size: 18px;
		line-height: 1;
		color: #fff;
		padding: 4px;
		border-radius: 8px;
		transition: background 0.15s;
	}
	.cs-top__theme:hover {
		background: rgba(255, 255, 255, 0.08);
	}
	.cs-top__bell {
		position: relative;
	}
	.cs-top__bell-btn {
		background: none;
		border: none;
		cursor: pointer;
		font-size: 18px;
		position: relative;
		color: #fff;
	}
	.cs-top__bell-count {
		position: absolute;
		top: -4px;
		right: -4px;
		background: var(--c-red);
		color: #fff;
		font-size: 9px;
		font-weight: 700;
		width: 16px;
		height: 16px;
		border-radius: 99px;
		display: grid;
		place-items: center;
	}
	.cs-top__menu-panel {
		position: absolute;
		top: 36px;
		right: 0;
		width: 280px;
		max-width: calc(100vw - 24px);
		background: var(--c-card);
		border-radius: 12px;
		box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
		border: 1px solid var(--c-border);
		z-index: 900;
		overflow: hidden;
	}
	.cs-top__menu-head {
		padding: 12px 16px;
		border-bottom: 1px solid var(--c-border);
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-weight: 700;
		font-size: 13px;
		color: var(--c-text);
	}
	.cs-top__menu-clear {
		background: none;
		border: none;
		color: var(--c-blue);
		font-size: 12px;
		cursor: pointer;
	}
	.cs-top__menu-empty {
		padding: 24px 16px;
		text-align: center;
		color: var(--c-muted);
		font-size: 13px;
	}
	.cs-top__menu-item {
		padding: 12px 16px;
		border-bottom: 1px solid var(--c-border);
		font-size: 13px;
		color: var(--c-sub);
		display: flex;
		gap: 8px;
	}
	.cs-top__menu-item:last-child {
		border-bottom: none;
	}
</style>
