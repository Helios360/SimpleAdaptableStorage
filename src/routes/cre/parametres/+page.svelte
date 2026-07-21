<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import Button from '$lib/components/Button.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Input from '$lib/components/Input.svelte';
	import Confirm from '$lib/components/Confirm.svelte';
	import Empty from '$lib/components/Empty.svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { pushToast } from '$lib/stores/toast.svelte';
	import { initials } from '$lib/utils';
	import type { PageData } from './$types';
	import type { SubmitFunction } from '@sveltejs/kit';

	let { data }: { data: PageData } = $props();

	type Tab = 'schools' | 'formations' | 'promos' | 'admins';
	let tab = $state<Tab>('schools');
	const tabs: { key: Tab; label: string; icon: string }[] = [
		{ key: 'schools', label: 'Écoles', icon: '🏫' },
		{ key: 'formations', label: 'Formations', icon: '🎓' },
		{ key: 'promos', label: 'Promos', icon: '📅' },
		{ key: 'admins', label: 'Membres', icon: '👤' }
	];

	const SCHOOL_TYPE_LABEL: Record<string, string> = {
		cloud_campus: 'Cloud Campus',
		skalys: 'Skalys',
		autre: 'Autre'
	};

	// ─── School modal ───────────────────────────────────────────────────────
	type SchoolRow = PageData['schools'][number];
	let schoolModal = $state(false);
	let editingSchool = $state<SchoolRow | null>(null);
	let sName = $state('');
	let sReglement = $state('');

	function openSchool(row: SchoolRow | null) {
		editingSchool = row;
		sName = row?.name ?? '';
		sReglement = row?.reglementUrl ?? '';
		schoolModal = true;
	}

	// ─── Formation modal ────────────────────────────────────────────────────
	type FormationRow = PageData['formations'][number];
	let formationModal = $state(false);
	let editingFormation = $state<FormationRow | null>(null);
	let fCode = $state('');
	let fName = $state('');
	let fSchoolId = $state('');

	function openFormation(row: FormationRow | null) {
		editingFormation = row;
		fCode = row?.code ?? '';
		fName = row?.name ?? '';
		fSchoolId = row?.schoolId != null ? String(row.schoolId) : '';
		formationModal = true;
	}

	// ─── Promo modal ────────────────────────────────────────────────────────
	type PromoRow = PageData['promos'][number];
	let promoModal = $state(false);
	let editingPromo = $state<PromoRow | null>(null);
	let pLabel = $state('');
	let pYear = $state('');
	let pFormationId = $state('');
	let pSchoolId = $state('');

	function openPromo(row: PromoRow | null) {
		editingPromo = row;
		pLabel = row?.label ?? '';
		pYear = row?.year != null ? String(row.year) : '';
		pFormationId = row?.formationId != null ? String(row.formationId) : '';
		pSchoolId = row?.schoolId != null ? String(row.schoolId) : '';
		promoModal = true;
	}

	// ─── Delete confirm ─────────────────────────────────────────────────────
	let confirmOpen = $state(false);
	let confirmTitle = $state('');
	let confirmMessage = $state('');
	let confirmAction = $state('');
	let confirmId = $state<number | null>(null);

	function askDelete(
		kind: 'school' | 'formation' | 'promo',
		row: { id: number; label?: string; code?: string; name?: string }
	) {
		confirmId = row.id;
		if (kind === 'school') {
			confirmAction = '?/deleteSchool';
			confirmTitle = "Supprimer l'école";
			confirmMessage = `Supprimer « ${row.name} » ? Les membres, formations et promos rattachés seront simplement détachés (non supprimés).`;
		} else if (kind === 'formation') {
			confirmAction = '?/deleteFormation';
			confirmTitle = 'Supprimer la formation';
			confirmMessage = `Supprimer « ${row.code} — ${row.name} » ? Cette action est définitive.`;
		} else {
			confirmAction = '?/deletePromo';
			confirmTitle = 'Supprimer la promo';
			confirmMessage = `Supprimer la promo « ${row.label} » ? Cette action est définitive.`;
		}
		confirmOpen = true;
	}

	let deleteForm = $state<HTMLFormElement>();
	function runDelete() {
		confirmOpen = false;
		deleteForm?.requestSubmit();
	}

	// ─── Shared enhance handler ─────────────────────────────────────────────
	function handle(successMsg: string, onSuccess?: () => void): SubmitFunction {
		return () =>
			async ({ result }) => {
				if (result.type === 'success') {
					pushToast(successMsg, 'success');
					onSuccess?.();
					await invalidateAll();
				} else if (result.type === 'failure') {
					pushToast((result.data as { error?: string })?.error ?? 'Une erreur est survenue.', 'error');
				} else if (result.type === 'error') {
					pushToast('Une erreur est survenue.', 'error');
				}
			};
	}
</script>

<div class="cs-params">
	<nav class="cs-params__tabs" aria-label="Sections des paramètres">
		{#each tabs as t}
			<button
				class="cs-params__tab"
				class:cs-params__tab--active={tab === t.key}
				onclick={() => (tab = t.key)}
			>
				<span>{t.icon}</span>{t.label}
			</button>
		{/each}
	</nav>

	{#if tab === 'schools'}
		<Card padding="0">
			<div class="cs-params__head">
				<div>
					<h2 class="cs-params__title">Écoles</h2>
					<p class="cs-params__sub">Établissements de rattachement (membres, formations, promos).</p>
				</div>
				<Button icon="＋" onclick={() => openSchool(null)}>Nouvelle école</Button>
			</div>
			{#if data.schools.length === 0}
				<Empty title="Aucune école." />
			{:else}
				<table class="cs-tbl">
					<thead>
						<tr><th>Nom</th><th>Type</th><th>Membres</th><th></th></tr>
					</thead>
					<tbody>
						{#each data.schools as s}
							<tr>
								<td>{s.name}</td>
								<td><Badge label={SCHOOL_TYPE_LABEL[s.type] ?? s.type} /></td>
								<td class="cs-tbl__muted">{s.memberCount}</td>
								<td class="cs-tbl__actions">
									<Button variant="subtle" size="sm" onclick={() => openSchool(s)}>Modifier</Button>
									<Button variant="ghost" size="sm" onclick={() => askDelete('school', s)}>Supprimer</Button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</Card>
	{:else if tab === 'formations'}
		<Card padding="0">
			<div class="cs-params__head">
				<div>
					<h2 class="cs-params__title">Formations</h2>
					<p class="cs-params__sub">Catalogue des formations proposées.</p>
				</div>
				<Button icon="＋" onclick={() => openFormation(null)}>Nouvelle formation</Button>
			</div>
			{#if data.formations.length === 0}
				<Empty title="Aucune formation." />
			{:else}
				<table class="cs-tbl">
					<thead>
						<tr><th>Code</th><th>Nom</th><th>École</th><th>Étudiants</th><th></th></tr>
					</thead>
					<tbody>
						{#each data.formations as f}
							<tr>
								<td><Badge label={f.code} /></td>
								<td>{f.name}</td>
								<td class="cs-tbl__muted">{f.schoolName ?? '—'}</td>
								<td class="cs-tbl__muted">{f.studentCount}</td>
								<td class="cs-tbl__actions">
									<Button variant="subtle" size="sm" onclick={() => openFormation(f)}>Modifier</Button>
									<Button
										variant="ghost"
										size="sm"
										disabled={f.studentCount > 0}
										title={f.studentCount > 0 ? 'Des étudiants y sont rattachés' : 'Supprimer'}
										onclick={() => askDelete('formation', f)}>Supprimer</Button
									>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</Card>
	{:else if tab === 'promos'}
		<Card padding="0">
			<div class="cs-params__head">
				<div>
					<h2 class="cs-params__title">Promos</h2>
					<p class="cs-params__sub">Promotions (cohortes) gérées par l'école.</p>
				</div>
				<Button icon="＋" onclick={() => openPromo(null)}>Nouvelle promo</Button>
			</div>
			{#if data.promos.length === 0}
				<Empty title="Aucune promo." />
			{:else}
				<table class="cs-tbl">
					<thead>
						<tr><th>Nom</th><th>Année</th><th>Formation</th><th>École</th><th></th></tr>
					</thead>
					<tbody>
						{#each data.promos as p}
							<tr>
								<td>{p.label}</td>
								<td class="cs-tbl__muted">{p.year ?? '—'}</td>
								<td class="cs-tbl__muted">{p.formationName ?? '—'}</td>
								<td class="cs-tbl__muted">{p.schoolName ?? '—'}</td>
								<td class="cs-tbl__actions">
									<Button variant="subtle" size="sm" onclick={() => openPromo(p)}>Modifier</Button>
									<Button variant="ghost" size="sm" onclick={() => askDelete('promo', p)}>Supprimer</Button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</Card>
	{:else}
		<Card padding="0">
			<div class="cs-params__head">
				<div>
					<h2 class="cs-params__title">Membres de l'école</h2>
					<p class="cs-params__sub">Comptes ayant accès à l'espace École.</p>
				</div>
			</div>
			{#if data.admins.length === 0}
				<Empty title="Aucun membre." />
			{:else}
				<ul class="cs-members">
					{#each data.admins as a}
						<li class="cs-member">
							<div class="cs-member__avatar">{a.avatar ?? initials(a.name)}</div>
							<div class="cs-member__info">
								<div class="cs-member__name">
									{a.name}
									{#if a.id === data.currentUserId}<Badge label="Vous" color="var(--c-green-light)" textColor="var(--c-green)" />{/if}
								</div>
								<div class="cs-member__meta">
									{a.email}{#if a.schoolName} · {a.schoolName}{/if}
								</div>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</Card>
	{/if}
</div>

<!-- School create / edit -->
<Modal
	open={schoolModal}
	onclose={() => (schoolModal = false)}
	title={editingSchool ? "Modifier l'école" : 'Nouvelle école'}
>
	<form
		method="POST"
		action={editingSchool ? '?/updateSchool' : '?/createSchool'}
		use:enhance={handle(editingSchool ? 'École modifiée.' : 'École créée.', () => (schoolModal = false))}
	>
		{#if editingSchool}<input type="hidden" name="id" value={editingSchool.id} />{/if}
		<Input label="Nom" name="name" bind:value={sName} required placeholder="Cloud Campus" />
		<Input
			label="Règlement intérieur (URL)"
			name="reglementUrl"
			bind:value={sReglement}
			placeholder="https://…"
		/>
		<p class="cs-params__hint">Le type (checklist) est déduit automatiquement du nom.</p>
		<div class="cs-modal-actions">
			<Button variant="subtle" onclick={() => (schoolModal = false)}>Annuler</Button>
			<Button type="submit">{editingSchool ? 'Enregistrer' : 'Créer'}</Button>
		</div>
	</form>
</Modal>

<!-- Formation create / edit -->
<Modal
	open={formationModal}
	onclose={() => (formationModal = false)}
	title={editingFormation ? 'Modifier la formation' : 'Nouvelle formation'}
>
	<form
		method="POST"
		action={editingFormation ? '?/updateFormation' : '?/createFormation'}
		use:enhance={handle(editingFormation ? 'Formation modifiée.' : 'Formation créée.', () => (formationModal = false))}
	>
		{#if editingFormation}<input type="hidden" name="id" value={editingFormation.id} />{/if}
		<Input label="Code" name="code" bind:value={fCode} required placeholder="BTS SIO" />
		<Input label="Nom" name="name" bind:value={fName} required placeholder="Services informatiques aux organisations" />
		<div class="cs-field">
			<label for="formation-school" class="cs-params__label">École (optionnel)</label>
			<select id="formation-school" name="schoolId" bind:value={fSchoolId} class="cs-select">
				<option value="">—</option>
				{#each data.schools as s}
					<option value={String(s.id)}>{s.name}</option>
				{/each}
			</select>
		</div>
		<div class="cs-modal-actions">
			<Button variant="subtle" onclick={() => (formationModal = false)}>Annuler</Button>
			<Button type="submit">{editingFormation ? 'Enregistrer' : 'Créer'}</Button>
		</div>
	</form>
</Modal>

<!-- Promo create / edit -->
<Modal
	open={promoModal}
	onclose={() => (promoModal = false)}
	title={editingPromo ? 'Modifier la promo' : 'Nouvelle promo'}
>
	<form
		method="POST"
		action={editingPromo ? '?/updatePromo' : '?/createPromo'}
		use:enhance={handle(editingPromo ? 'Promo modifiée.' : 'Promo créée.', () => (promoModal = false))}
	>
		{#if editingPromo}<input type="hidden" name="id" value={editingPromo.id} />{/if}
		<Input label="Nom" name="label" bind:value={pLabel} required placeholder="BTS SIO 2025" />
		<Input label="Année" name="year" type="number" bind:value={pYear} placeholder="2025" />
		<div class="cs-field">
			<label for="promo-school" class="cs-params__label">École (optionnel)</label>
			<select id="promo-school" name="schoolId" bind:value={pSchoolId} class="cs-select">
				<option value="">—</option>
				{#each data.schools as s}
					<option value={String(s.id)}>{s.name}</option>
				{/each}
			</select>
		</div>
		<div class="cs-field">
			<label for="promo-formation" class="cs-params__label">Formation (optionnel)</label>
			<select id="promo-formation" name="formationId" bind:value={pFormationId} class="cs-select">
				<option value="">—</option>
				{#each data.formations as f}
					<option value={String(f.id)}>{f.code} — {f.name}</option>
				{/each}
			</select>
		</div>
		<div class="cs-modal-actions">
			<Button variant="subtle" onclick={() => (promoModal = false)}>Annuler</Button>
			<Button type="submit">{editingPromo ? 'Enregistrer' : 'Créer'}</Button>
		</div>
	</form>
</Modal>

<!-- Hidden delete form driven by the Confirm dialog -->
<form bind:this={deleteForm} method="POST" action={confirmAction} use:enhance={handle('Suppression effectuée.')} hidden>
	<input type="hidden" name="id" value={confirmId} />
</form>
<Confirm
	open={confirmOpen}
	onclose={() => (confirmOpen = false)}
	onconfirm={runDelete}
	title={confirmTitle}
	message={confirmMessage}
	danger
/>

<style>
	.cs-params {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}
	.cs-params__tabs {
		display: flex;
		gap: 4px;
		background: var(--c-card);
		border: 1px solid var(--c-border);
		border-radius: 12px;
		padding: 4px;
		width: fit-content;
		max-width: 100%;
		overflow-x: auto;
	}
	.cs-params__tab {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 8px 16px;
		border: none;
		background: none;
		border-radius: 9px;
		color: var(--c-muted);
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		white-space: nowrap;
		transition: all 0.12s;
	}
	.cs-params__tab:hover {
		color: var(--c-text);
	}
	.cs-params__tab--active {
		background: rgba(26, 86, 219, 0.12);
		color: var(--c-blue);
	}
	.cs-params__head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
		padding: 20px 22px;
		border-bottom: 1px solid var(--c-border);
	}
	.cs-params__title {
		font-size: 16px;
		font-weight: 800;
		color: var(--c-text);
		margin: 0;
	}
	.cs-params__sub {
		font-size: 13px;
		color: var(--c-muted);
		margin: 2px 0 0;
	}
	.cs-tbl {
		width: 100%;
		border-collapse: collapse;
		font-size: 13px;
	}
	.cs-tbl th {
		text-align: left;
		padding: 10px 22px;
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--c-muted);
		border-bottom: 1px solid var(--c-border);
	}
	.cs-tbl td {
		padding: 12px 22px;
		border-bottom: 1px solid var(--c-border);
		color: var(--c-text);
		vertical-align: middle;
	}
	.cs-tbl tr:last-child td {
		border-bottom: none;
	}
	.cs-tbl__muted {
		color: var(--c-sub);
	}
	.cs-tbl__actions {
		display: flex;
		gap: 6px;
		justify-content: flex-end;
	}
	.cs-members {
		list-style: none;
		margin: 0;
		padding: 8px;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.cs-member {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 14px;
		border-radius: 10px;
	}
	.cs-member:hover {
		background: var(--c-hover, rgba(0, 0, 0, 0.03));
	}
	.cs-member__avatar {
		width: 38px;
		height: 38px;
		border-radius: 11px;
		background: var(--c-purple-light);
		color: var(--c-purple);
		display: grid;
		place-items: center;
		font-size: 13px;
		font-weight: 700;
		flex-shrink: 0;
	}
	.cs-member__name {
		font-size: 14px;
		font-weight: 600;
		color: var(--c-text);
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.cs-member__meta {
		font-size: 12px;
		color: var(--c-muted);
		margin-top: 1px;
	}
	.cs-modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		margin-top: 20px;
	}
	.cs-params__label {
		display: block;
		font-size: 13px;
		font-weight: 600;
		color: var(--c-text);
		margin-bottom: 6px;
	}
	.cs-params__hint {
		font-size: 12px;
		color: var(--c-muted);
		margin: 8px 0 0;
	}
	.cs-select {
		width: 100%;
		padding: 10px 12px;
		border: 1px solid var(--c-border);
		border-radius: 9px;
		background: var(--c-card);
		color: var(--c-text);
		font-size: 14px;
	}
</style>
