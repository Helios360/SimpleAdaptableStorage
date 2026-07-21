<script lang="ts">
	import { theme } from '$lib/stores/theme.svelte';
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import Logo from './Logo.svelte';
	import type { NavItem } from './Sidebar.svelte';

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
		nav?: NavItem[];
	}

	let { title, onmenuclick, isMobile, notifications = [], onclearnotifs, nav }: Props = $props();
	let open = $state(false);
	const t = theme();

	function isActive(href: string): boolean {
		const path = $page.url.pathname;
		let best = '';
		for (const it of nav ?? []) {
			if (path === it.href || (it.href !== '/' && path.startsWith(it.href + '/'))) {
				if (it.href.length > best.length) best = it.href;
			}
		}
		return best === href;
	}
</script>

<div class="cs-top" class:cs-top--mobile={isMobile}>
	{#if isMobile && !nav}
		<button class="cs-top__menu" aria-label="Menu" onclick={onmenuclick}>☰</button>
	{/if}
	<a href="/" class="cs-top__brand" aria-label="Accueil">
		<Logo size={32} variant={t.value === 'dark' ? 'light' : 'dark'} showText={!isMobile} />
	</a>
	<span class="cs-top__sep" aria-hidden="true"></span>
	{#if nav}
		<nav class="cs-top__nav" aria-label="Navigation">
			{#each nav as item}
				{@const active = isActive(item.href)}
				<a
					href={item.href}
					class="cs-top__nav-link"
					class:cs-top__nav-link--active={active}
					aria-current={active ? 'page' : undefined}
				>
					<span class="cs-top__nav-icon">{item.icon}</span>
					{#if !isMobile}{item.label}{/if}
				</a>
			{/each}
		</nav>
	{:else}
		<span class="cs-top__title">{title}</span>
	{/if}
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
	{#if nav}
		<form method="POST" action="/logout" use:enhance class="cs-top__logout-form">
			<button type="submit" class="cs-top__logout" aria-label="Déconnexion" title="Déconnexion">
				⤴{#if !isMobile}<span>Déconnexion</span>{/if}
			</button>
		</form>
	{/if}
</div>

<style>
	.cs-top {
		background: var(--c-topbar-bg);
		padding: 14px 32px;
		margin:20px 30px;
		display: flex;
		align-items: center;
		gap: 12px;
		position: sticky;
		z-index: 800;
		border-radius: 14px;
		border: 1px solid var(--c-topbar-border);
		transition: background 0.2s, border-color 0.2s;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
	}
	.cs-top--mobile {
		padding: 14px 18px;
	}
	.cs-top__menu {
		background: none;
		border: none;
		color: var(--c-topbar-text);
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
		background: var(--c-topbar-sep);
		margin: 0 4px;
	}
	.cs-top__title {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 16px;
		color: var(--c-topbar-text);
		flex: 1;
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.cs-top__nav {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 4px;
		overflow-x: auto;
		scrollbar-width: none;
	}
	.cs-top__nav::-webkit-scrollbar {
		display: none;
	}
	.cs-top__nav-link {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 8px 14px;
		border-radius: 9px;
		border: 1px solid transparent;
		color: var(--c-topbar-muted);
		font-size: 13px;
		font-weight: 500;
		white-space: nowrap;
		text-decoration: none;
		transition: all 0.12s;
	}
	.cs-top__nav-link:hover {
		color: var(--c-topbar-text);
		background: var(--c-topbar-hover);
	}
	.cs-top__nav-link--active {
		background: rgba(26, 86, 219, 0.25);
		border-color: rgba(26, 86, 219, 0.4);
		color: var(--c-topbar-text);
		font-weight: 600;
	}
	.cs-top__nav-icon {
		font-size: 15px;
	}
	.cs-top__logout-form {
		display: flex;
	}
	.cs-top__logout {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		border-radius: 9px;
		background: none;
		border: none;
		color: var(--c-topbar-muted);
		font-size: 13px;
		cursor: pointer;
		white-space: nowrap;
		transition: color 0.12s;
	}
	.cs-top__logout:hover {
		color: var(--c-topbar-text);
	}
	.cs-top__theme {
		background: none;
		border: none;
		cursor: pointer;
		font-size: 18px;
		line-height: 1;
		color: var(--c-topbar-text);
		padding: 4px;
		border-radius: 8px;
		transition: background 0.15s;
	}
	.cs-top__theme:hover {
		background: var(--c-topbar-hover);
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
		color: var(--c-topbar-text);
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
