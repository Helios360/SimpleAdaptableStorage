<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import Button from '$lib/components/Button.svelte';
	import Empty from '$lib/components/Empty.svelte';
	import type { LayoutData } from '../$types';

	let { data }: { data: LayoutData } = $props();
	const tosa = $derived(data.candidat?.tosa ?? null);
</script>

<div class="cs-tosa">
	<Card padding="28px">
		{#if tosa}
			<div class="cs-tosa__inner">
				<div class="cs-tosa__emoji">🎓</div>
				<div class="cs-tosa__val">{tosa}<small>/1000</small></div>
				<p class="cs-tosa__sub">Certification obtenue · Excel / Word / PowerPoint</p>
			</div>
		{:else}
			<Empty icon="🎓" title="Aucune certification" sub="Certifiez vos compétences avec Isograd.">
				{#snippet action()}
					<Button>Passer la certification</Button>
				{/snippet}
			</Empty>
		{/if}
	</Card>
</div>

<style>
	.cs-tosa {
		max-width: 560px;
	}
	.cs-tosa__inner {
		text-align: center;
	}
	.cs-tosa__emoji {
		font-size: 48px;
	}
	.cs-tosa__val {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: clamp(34px, 10vw, 44px);
		color: var(--c-purple);
		margin: 8px 0;
	}
	.cs-tosa__val small {
		font-size: 20px;
	}
	.cs-tosa__sub {
		color: var(--c-muted);
		font-size: 14px;
	}
</style>
