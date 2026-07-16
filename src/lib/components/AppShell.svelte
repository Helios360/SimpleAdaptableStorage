<script lang="ts">
	import type { Snippet } from 'svelte';
	import Sidebar, { type NavItem } from './Sidebar.svelte';
	import Topbar from './Topbar.svelte';
	import { viewportWidth } from '$lib/stores/viewport.svelte';
	import { page } from '$app/stores';
	import type { User } from '$lib/server/auth';

	interface Notif {
		icon: string;
		text: string;
	}

	interface Props {
		user: Pick<User, 'name' | 'role' | 'avatar'>;
		nav: NavItem[];
		title: string;
		notifications?: Notif[];
		/** Render nav in the header instead of the sidebar. */
		headerNav?: boolean;
		children?: Snippet;
	}

	let { user, nav, title, notifications = [], headerNav = false, children }: Props = $props();
	const vp = viewportWidth();
	let sidebarOpen = $state(false);
	let cleared = $state(false);
	const notifs = $derived(cleared ? [] : notifications);

	// reset overlay on route change
	$effect(() => {
		$page.url.pathname;
		sidebarOpen = false;
	});
</script>

<div class="cs-shell">
	<Topbar
		{title}
		nav={headerNav ? nav : undefined}
		onmenuclick={() => (sidebarOpen = true)}
		isMobile={vp.isMobile}
		notifications={notifs}
		onclearnotifs={() => (cleared = true)}
	/>
	<div class="cs-shell__row">
		{#if !headerNav}
			<Sidebar
				items={nav}
				{user}
				open={sidebarOpen}
				onclose={() => (sidebarOpen = false)}
				isMobile={vp.isMobile}
			/>
		{/if}
		<main class="cs-shell__body" class:cs-shell__body--mobile={vp.isMobile}>
			<div class="cs-shell__content">
				{#if children}{@render children()}{/if}
			</div>
		</main>
	</div>
</div>

<style>
	.cs-shell {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		background: var(--c-bg);
	}
	.cs-shell__row {
		display: flex;
		flex: 1;
		min-height: 0;
	}
	.cs-shell__body {
		flex: 1;
		min-width: 0;
		padding: 20px 0px;
		overflow-y: auto;
	}
	/* Centre le contenu et le contraint à une largeur confortable sur grand écran ;
	   il remplit toute la largeur disponible en dessous du max-width. */
	.cs-shell__content {
		margin: 30px;
	}
	.cs-shell__body--mobile {
		padding: 14px;
	}
	@media (max-width: 480px) {
		.cs-shell__body--mobile {
			padding: 12px 10px;
		}
	}
</style>
