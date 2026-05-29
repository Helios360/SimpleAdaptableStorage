<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import Button from '$lib/components/Button.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import { pushToast } from '$lib/stores/toast.svelte';
	import { C } from '$lib/tokens';

	const sent = [
		{ id: 1, entreprise: 'Thales', profils: 3, ouvert: true, date: '2026-04-01' },
		{ id: 2, entreprise: 'BNP', profils: 2, ouvert: false, date: '2026-04-02' }
	];
</script>

<div class="cs-env">
	<div class="cs-env__head">
		<Button icon="📤" onclick={() => pushToast('Envoi lancé ✓')}>Nouvel envoi</Button>
	</div>
	{#each sent as s}
		<Card padding="16px 20px" class="cs-env__row">
			<div class="cs-env__body">
				<p class="cs-env__name">{s.entreprise}</p>
				<p class="cs-env__sub">{s.profils} profil(s) · {s.date}</p>
			</div>
			<Badge
				label={s.ouvert ? '💬 Ouvert' : '⏳ Non ouvert'}
				color={s.ouvert ? C.greenLight : C.orangeLight}
				textColor={s.ouvert ? C.green : C.orange}
			/>
			<Button size="sm" variant="ghost" onclick={() => pushToast(`Relance envoyée à ${s.entreprise}`)}>
				Relancer
			</Button>
		</Card>
	{/each}
</div>

<style>
	.cs-env {
		max-width: 760px;
	}
	.cs-env__head {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		margin-bottom: 20px;
	}
	:global(.cs-env__row) {
		display: flex;
		align-items: center;
		gap: 14px;
		margin-bottom: 10px;
		flex-wrap: wrap;
	}
	.cs-env__body {
		flex: 1 1 200px;
		min-width: 0;
	}
	.cs-env__name {
		font-weight: 600;
		font-size: 14px;
		color: var(--c-text);
	}
	.cs-env__sub {
		font-size: 12px;
		color: var(--c-muted);
	}
</style>
