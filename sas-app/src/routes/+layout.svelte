<script lang="ts">
	import { onMount } from 'svelte';
	import { initTheme } from '$lib/theme';

	import favicon from '$lib/assets/Logo512.webp';
	import '../app.css';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';

	let { data, children } = $props();
	const logoUrl = data.logoUrl;

	onMount(() => { initTheme() });

	export children
</script>

<svelte:head>
	<link rel="icon" href={logoUrl} />
	<script>
	(function () {
		const isDark = localStorage.getItem('theme') === 'dark';
		if (isDark) {
			document.documentElement.classList.add('dark');
		}
	})();
	</script>
</svelte:head>

<Header logoUrl={logoUrl} />
{@render children()}
<Footer />
