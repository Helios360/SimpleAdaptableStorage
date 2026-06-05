<script lang="ts">
	interface Props {
		title?: string;
		sub?: string;
	}

	let {
		title = 'En construction',
		sub = 'Cette fonctionnalité arrive bientôt.'
	}: Props = $props();
</script>

<div class="cs-wip">
	<div class="cs-wip__card">
		<div class="cs-wip__icon">🚧</div>
		<p class="cs-wip__title">{title}</p>
		<p class="cs-wip__sub">{sub}</p>
		<span class="cs-wip__badge">Bientôt disponible</span>
	</div>
</div>

<style>
	.cs-wip {
		display: grid;
		place-items: center;
		padding: 48px 24px;
		min-height: 50vh;
	}
	.cs-wip__card {
		text-align: center;
		max-width: 420px;
		background: var(--c-card);
		border: 1px solid var(--c-border);
		border-radius: 16px;
		padding: 40px 32px;
	}
	.cs-wip__icon {
		font-size: 52px;
		margin-bottom: 14px;
	}
	.cs-wip__title {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 20px;
		color: var(--c-text);
		margin-bottom: 8px;
	}
	.cs-wip__sub {
		font-size: 14px;
		color: var(--c-muted);
		line-height: 1.6;
		margin-bottom: 18px;
	}
	.cs-wip__badge {
		display: inline-block;
		padding: 5px 14px;
		border-radius: 99px;
		background: var(--c-orange-light);
		color: var(--c-orange-text);
		font-size: 12px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
</style>
