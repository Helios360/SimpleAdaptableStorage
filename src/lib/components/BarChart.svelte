<script lang="ts">
	interface Props {
		data: { label: string; value: number }[];
		color?: string;
	}

	let { data, color = 'var(--c-blue)' }: Props = $props();

	let max = $derived(Math.max(...data.map((d) => d.value), 1));
</script>

<div class="cs-bars">
	{#each data as d}
		<div class="cs-bars__col">
			<span class="cs-bars__value" style:color>{d.value}</span>
			<div class="cs-bars__bar" style:background={color} style:height="{(d.value / max) * 100}%"></div>
			<span class="cs-bars__label">{d.label}</span>
		</div>
	{/each}
</div>

<style>
	.cs-bars {
		display: flex;
		align-items: flex-end;
		gap: 12px;
		height: 140px;
		padding: 0 4px;
	}
	.cs-bars__col {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
	}
	.cs-bars__value {
		font-size: 12px;
		font-weight: 700;
	}
	.cs-bars__bar {
		width: 100%;
		max-width: 40px;
		min-height: 4px;
		border-radius: 6px 6px 0 0;
		transition: height 0.6s ease;
	}
	.cs-bars__label {
		font-size: 11px;
		color: var(--c-muted);
		text-align: center;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 100%;
	}
	@media (max-width: 540px) {
		.cs-bars {
			gap: 6px;
			height: 120px;
		}
		.cs-bars__value {
			font-size: 11px;
		}
		.cs-bars__label {
			font-size: 10px;
		}
	}
</style>
