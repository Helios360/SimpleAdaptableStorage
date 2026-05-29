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
		children?: Snippet;
	}

	let { user, nav, title, notifications = [], children }: Props = $props();
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
		onmenuclick={() => (sidebarOpen = true)}
		isMobile={vp.isMobile}
		notifications={notifs}
		onclearnotifs={() => (cleared = true)}
	/>
	<div class="cs-shell__row">
		<Sidebar
			items={nav}
			{user}
			open={sidebarOpen}
			onclose={() => (sidebarOpen = false)}
			isMobile={vp.isMobile}
		/>
		<main class="cs-shell__body" class:cs-shell__body--mobile={vp.isMobile}>
			{#if children}{@render children()}{/if}
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
		padding: 28px 32px;
		overflow-y: auto;
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
