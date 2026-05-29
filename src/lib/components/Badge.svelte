<script lang="ts">
	interface Props {
		label: string;
		color?: string;
		textColor?: string;
		size?: number;
	}

	let { label, color = 'var(--c-blue-light)', textColor = 'var(--c-blue)', size = 11 }: Props = $props();
</script>

<span class="cs-badge" style:background={color} style:color={textColor} style:font-size="{size}px">{label}</span>

<style>
	.cs-badge {
		font-weight: 700;
		padding: 2px 8px;
		border-radius: 99px;
		font-family: var(--font-body);
		white-space: nowrap;
		display: inline-block;
	}
</style>
