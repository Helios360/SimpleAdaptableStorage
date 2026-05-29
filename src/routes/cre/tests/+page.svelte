<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import Button from '$lib/components/Button.svelte';
	import Input from '$lib/components/Input.svelte';
	import { pushToast } from '$lib/stores/toast.svelte';

	let poste = $state('');
	let type = $state<'code' | 'logique' | 'psycho' | 'culture'>('code');
	let generated = $state(false);
	let loading = $state(false);

	const TYPES = [
		{ id: 'code', label: 'Code' },
		{ id: 'logique', label: 'Logique' },
		{ id: 'psycho', label: 'Psychotechnique' },
		{ id: 'culture', label: 'Culture générale' }
	] as const;

	const PREVIEW = [
		'Quelle est la complexité d’un tri rapide ?',
		'Citez 3 design patterns courants.',
		'Différence entre interface et classe abstraite ?'
	];

	function generate() {
		if (!poste.trim()) return;
		loading = true;
		setTimeout(() => {
			generated = true;
			loading = false;
			pushToast('Questions générées ✓');
		}, 900);
	}
</script>

<div class="cs-tcre">
	<Card padding="24px" class="cs-tcre__form">
		<Input label="Poste cible" name="poste" bind:value={poste} placeholder="Ex: Développeur Python" required />
		<div class="cs-tcre__types">
			<p class="cs-tcre__lab">Type de test *</p>
			<div class="cs-tcre__chips">
				{#each TYPES as t}
					<button
						class="cs-tcre__chip"
						class:cs-tcre__chip--active={type === t.id}
						onclick={() => (type = t.id)}
					>
						{t.label}
					</button>
				{/each}
			</div>
		</div>
		<Button onclick={generate} disabled={loading || !poste.trim()}>
			{loading ? 'Génération…' : '🧠 Générer les questions'}
		</Button>
	</Card>

	{#if generated}
		<Card padding="24px">
			<p class="cs-tcre__preview-title">Aperçu — {poste} ({type})</p>
			{#each PREVIEW as q, i}
				<div class="cs-tcre__preview-q">{i + 1}. {q}</div>
			{/each}
			<div class="cs-tcre__preview-actions">
				<Button onclick={() => pushToast('Test assigné ✓')}>📤 Assigner</Button>
				<Button variant="ghost" onclick={() => (generated = false)}>Régénérer</Button>
			</div>
		</Card>
	{/if}
</div>

<style>
	.cs-tcre {
		max-width: 680px;
	}
	:global(.cs-tcre__form) {
		margin-bottom: 16px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.cs-tcre__types {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.cs-tcre__lab {
		font-size: 13px;
		font-weight: 600;
		color: var(--c-sub);
	}
	.cs-tcre__chips {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}
	.cs-tcre__chip {
		padding: 7px 14px;
		border-radius: 8px;
		border: 1.5px solid var(--c-border);
		background: var(--c-card);
		color: var(--c-text);
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
	}
	.cs-tcre__chip--active {
		background: var(--c-blue);
		color: #fff;
		border-color: var(--c-blue);
	}
	.cs-tcre__preview-title {
		font-family: var(--font-display);
		font-weight: 700;
		font-size: 14px;
		margin-bottom: 14px;
		color: var(--c-text);
	}
	.cs-tcre__preview-q {
		padding: 10px 0;
		border-bottom: 1px solid var(--c-border);
		font-size: 13px;
		color: var(--c-sub);
	}
	.cs-tcre__preview-actions {
		display: flex;
		gap: 10px;
		margin-top: 16px;
		flex-wrap: wrap;
	}
</style>
