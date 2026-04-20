<script lang="ts">
	import { onMount } from 'svelte';
	import { initTheme } from '$lib/theme';

	import favicon from '$lib/assets/Logo512.webp';
	import logoUrl from '$lib/assets/Logo512.webp';

	import '../app.css';

	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';

	let { children } = $props();

	onMount(() => {
		initTheme();
	});
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

<Header {logoUrl} />
{@render children()}
<Footer />
