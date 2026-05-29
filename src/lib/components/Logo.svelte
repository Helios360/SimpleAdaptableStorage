<script lang="ts">
	interface Props {
		size?: number;
		showText?: boolean;
		variant?: 'light' | 'dark';
	}

	let { size = 32, showText = true, variant = 'dark' }: Props = $props();
</script>

<span class="cs-logo" class:cs-logo--light={variant === 'light'}>
	<img src="/favicon.svg" alt="CloudStudent" width={size} height={size} />
	{#if showText}
		<span class="cs-logo__text" style:font-size="{Math.round(size * 0.55)}px">
			Cloud<span class="cs-logo__accent">Student</span>
		</span>
	{/if}
</span>

<style>
	.cs-logo {
		display: inline-flex;
		align-items: center;
		gap: 10px;
	}
	.cs-logo img {
		display: block;
		border-radius: 22%;
	}
	.cs-logo__text {
		font-family: var(--font-display);
		font-weight: 800;
		letter-spacing: 0.3px;
		color: var(--c-text);
		line-height: 1;
	}
	.cs-logo--light .cs-logo__text {
		color: #fff;
	}
	.cs-logo__accent {
		color: var(--c-accent);
	}
</style>
