<script lang="ts">
	import { onMount } from 'svelte';
	import { initTheme } from '$lib/theme';

	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';

	let { children } = $props();

	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';

	onMount(() => { initTheme() });
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<script>
	(function () {
		const isDark = localStorage.getItem('theme') === 'dark';
		if (isDark) {
			document.documentElement.classList.add('dark');
		}
	})();
	</script>
</svelte:head>

<Header />
{@render children()}
<Footer />
