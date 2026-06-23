<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import Button from '$lib/components/Button.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Empty from '$lib/components/Empty.svelte';
	import { enhance } from '$app/forms';
	import { pushToast } from '$lib/stores/toast.svelte';
	import { candidatureLabel } from '$lib/utils';
	import { C } from '$lib/tokens';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let tab = $state<'offres' | 'candidatures'>('offres');

	let q = $state('');
	let debounced = $state('');
	let timer: ReturnType<typeof setTimeout>;
	$effect(() => {
		clearTimeout(timer);
		const v = q;
		timer = setTimeout(() => (debounced = v), 250);
	});

	const applied = $derived(new Set(data.appliedIds));

	const filtered = $derived(
		data.offres.filter((o) =>
			[o.titre, o.entreprise, o.lieu].some((x) => x.toLowerCase().includes(debounced.toLowerCase()))
		)
	);

	const statusColors: Record<string, { bg: string; fg: string }> = {
		envoyee: { bg: C.orangeLight, fg: C.orange },
		entretien: { bg: C.blueLight, fg: C.blue },
		refusee: { bg: C.redLight, fg: C.red }
	};
</script>

<div class="cs-jobs">
	<div class="cs-jobs__tabs" role="tablist">
		<button
			class="cs-jobs__tab"
			class:cs-jobs__tab--active={tab === 'offres'}
			role="tab"
			aria-selected={tab === 'offres'}
			onclick={() => (tab = 'offres')}
		>
			💼 Offres
		</button>
		<button
			class="cs-jobs__tab"
			class:cs-jobs__tab--active={tab === 'candidatures'}
			role="tab"
			aria-selected={tab === 'candidatures'}
			onclick={() => (tab = 'candidatures')}
		>
			📮 Mes candidatures
			{#if data.rows.length}<span class="cs-jobs__count">{data.rows.length}</span>{/if}
		</button>
	</div>

	{#if tab === 'offres'}
		<input class="cs-jobs__search" bind:value={q} placeholder="🔍 Rechercher…" />

		{#if filtered.length === 0}
			<Empty icon="💼" title="Aucune offre" sub={`Aucun résultat pour "${debounced}"`} />
		{:else}
			{#each filtered as o (o.id)}
				<Card padding="16px 20px" class="cs-job">
					<div class="cs-job__body">
						<p class="cs-job__name">{o.titre}</p>
						<p class="cs-job__sub">{o.entreprise} · {o.lieu} · {o.type}</p>
					</div>
					<Badge label={o.type} color="var(--c-blue-light)" />
					{#if applied.has(o.id)}
						<Badge label="Déjà candidaté" color={C.orangeLight} textColor={C.orange} />
					{:else}
						<form
							method="POST"
							action="?/apply"
							use:enhance={() =>
								async ({ update, result }) => {
									await update();
									if (result.type === 'success') {
										const ok =
											(result.data as { alreadyApplied?: boolean } | undefined)?.alreadyApplied !==
											true;
										pushToast(
											ok ? 'Candidature envoyée ✓' : 'Déjà candidaté',
											ok ? 'success' : 'info'
										);
									}
								}}
						>
							<input type="hidden" name="offreId" value={o.id} />
							<Button size="sm" type="submit">Postuler</Button>
						</form>
					{/if}
				</Card>
			{/each}
		{/if}
	{:else if data.rows.length === 0}
		<Empty
			icon="📮"
			title="Aucune candidature"
			sub="Postulez depuis l'onglet Offres."
		/>
	{:else}
		{#each data.rows as r (r.id)}
			{@const s = statusColors[r.statut] ?? { bg: C.bg, fg: C.muted }}
			<Card padding="16px 20px" class="cs-job">
				<div class="cs-job__body">
					<p class="cs-job__name">{r.titre}</p>
					<p class="cs-job__sub">
						{r.entreprise} · {new Date(r.date).toLocaleDateString('fr-FR')}
					</p>
				</div>
				<Badge label={candidatureLabel(r.statut)} color={s.bg} textColor={s.fg} />
			</Card>
		{/each}
	{/if}
</div>

<style>
	.cs-jobs {
		max-width: 800px;
	}
	.cs-jobs__tabs {
		display: flex;
		gap: 4px;
		margin-bottom: 16px;
		border-bottom: 1.5px solid var(--c-border);
	}
	.cs-jobs__tab {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 10px 16px;
		border: none;
		background: none;
		font-size: 14px;
		font-weight: 600;
		color: var(--c-muted);
		cursor: pointer;
		border-bottom: 2px solid transparent;
		margin-bottom: -1.5px;
	}
	.cs-jobs__tab--active {
		color: var(--c-text);
		border-bottom-color: var(--c-blue);
	}
	.cs-jobs__count {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 18px;
		height: 18px;
		padding: 0 5px;
		border-radius: 9px;
		background: var(--c-blue-light);
		color: var(--c-blue);
		font-size: 11px;
		font-weight: 700;
	}
	.cs-jobs__search {
		width: 100%;
		padding: 10px 16px;
		border-radius: 10px;
		border: 1.5px solid var(--c-border);
		font-size: 14px;
		margin-bottom: 16px;
		outline: none;
	}
	:global(.cs-job) {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 10px;
		flex-wrap: wrap;
	}
	.cs-job__body {
		flex: 1 1 200px;
		min-width: 0;
	}
	.cs-job__name {
		font-weight: 600;
		font-size: 14px;
		color: var(--c-text);
	}
	.cs-job__sub {
		font-size: 12px;
		color: var(--c-muted);
		margin-top: 3px;
	}
</style>
