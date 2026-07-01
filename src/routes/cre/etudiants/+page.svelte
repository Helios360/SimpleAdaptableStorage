<script lang="ts">
	import { untrack } from 'svelte';
	import Card from '$lib/components/Card.svelte';
	import Button from '$lib/components/Button.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Empty from '$lib/components/Empty.svelte';
	import Confirm from '$lib/components/Confirm.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Input from '$lib/components/Input.svelte';
	import FileUpload from '$lib/components/FileUpload.svelte';
	import CandidatDetail from '$lib/components/CandidatDetail.svelte';
	import { invalidateAll } from '$app/navigation';
	import { deserialize } from '$app/forms';
	import { initials, statutLabel, scoreColor, debounce } from '$lib/utils';
	import { pushToast } from '$lib/stores/toast.svelte';
	import { C } from '$lib/tokens';
	import type { PageData } from './$types';
	import type { CandidatView } from '$lib/components/CandidatDetail.svelte';
	import type { CandidatRow, SortKey } from '$lib/server/queries';

	let { data }: { data: PageData } = $props();

	// État de recherche
	let q = $state('');
	let selectedStatut = $state<string[]>([]);
	let selectedRecherche = $state<string[]>([]);
	let selectedYears = $state<number[]>([]);
	let selectedFormations = $state<number[]>([]);
	let place = $state('');
	let radius = $state('5');
	let postal = $state('');

	type PlaceSuggestion = { label: string; postcode?: string; city?: string };
	let placeSuggestions = $state<PlaceSuggestion[]>([]);
	let showPlaceSuggestions = $state(false);
	let placeAbort: AbortController | null = null;
	const BAN_URL = 'https://api-adresse.data.gouv.fr/search/';

	async function fetchPlaceSuggestions(query: string): Promise<PlaceSuggestion[]> {
		const trimmed = query.trim();
		if (trimmed.length < 2) return [];
		placeAbort?.abort();
		placeAbort = new AbortController();
		try {
			const params = new URLSearchParams({ q: trimmed, limit: '5', autocomplete: '1' });
			const res = await fetch(`${BAN_URL}?${params}`, { signal: placeAbort.signal });
			if (!res.ok) return [];
			const data = (await res.json()) as {
				features?: Array<{
					properties?: { label?: string; postcode?: string; city?: string };
				}>;
			};
			return (data.features ?? []).flatMap((f) => {
				const p = f.properties;
				return p?.label ? [{ label: p.label, postcode: p.postcode, city: p.city }] : [];
			});
		} catch {
			return [];
		}
	}

	const updatePlaceSuggestions = debounce(async () => {
		placeSuggestions = await fetchPlaceSuggestions(place);
	}, 200);

	function onPlaceInput() {
		showPlaceSuggestions = true;
		updatePlaceSuggestions();
		// On ne lance pas la recherche à chaque frappe : le rayon se calcule sur une
		// ville complète (suggestion choisie ou touche Entrée). Vider le champ retire
		// simplement le filtre de localisation.
		if (place.trim() === '') debouncedSearch();
	}

	function onPlaceKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			showPlaceSuggestions = false;
			fetchPage(1);
		}
	}

	function onPostalInput() {
		const p = postal.trim();
		// Le code postal ne filtre qu'une fois saisi entièrement (5 chiffres), ou
		// lorsqu'il est vidé pour retirer le filtre.
		if (p === '' || /^\d{5}$/.test(p)) debouncedSearch();
	}

	function pickPlaceSuggestion(s: PlaceSuggestion) {
		place = s.label;
		if (s.postcode) postal = s.postcode;
		placeSuggestions = [];
		showPlaceSuggestions = false;
		fetchPage(1);
	}

	async function resolvePlaceForSearch(): Promise<string> {
		const trimmed = place.trim();
		if (!trimmed) return '';
		const r = Number(radius);
		if (!r || r <= 0) return trimmed;
		if (placeSuggestions.length > 0) return placeSuggestions[0].label;
		const fresh = await fetchPlaceSuggestions(trimmed);
		if (fresh.length > 0) {
			placeSuggestions = fresh;
			return fresh[0].label;
		}
		return trimmed;
	}
	let age = $state('');
	let trancheAge = $state('');
	let permis = $state(false);
	let vehicule = $state(false);
	let mobile = $state(false);
	let currentTags = $state<string[]>([]);
	let currentSkills = $state<string[]>([]);
	let tagInput = $state('');
	let skillInput = $state('');

	// Résultats — initialisés depuis le load(), puis pilotés par /search.
	let rows = $state<CandidatRow[]>(untrack(() => data.initial.rows));
	let page = $state(untrack(() => data.initial.page));
	let pageSize = $state(untrack(() => data.initial.pageSize));
	let total = $state(untrack(() => data.initial.total));
	let totalPages = $state(untrack(() => data.initial.totalPages));
	let sortBy = $state<SortKey>('createdAt');
	let sortDir = $state<'asc' | 'desc'>('desc');
	let loading = $state(false);

	let confirmTarget = $state<{ id: number; action: 'valide' | 'refuse'; name: string } | null>(
		null
	);
	let detail = $state<CandidatView | null>(null);
	// Aperçu (lecture seule, façon CVthèque) vs édition complète.
	let previewMode = $state(false);

	function openEdit(r: CandidatRow) {
		previewMode = false;
		detail = r as CandidatView;
	}
	function openPreview(r: CandidatRow) {
		previewMode = true;
		detail = r as CandidatView;
	}

	// État du modal d'ajout
	let addOpen = $state(false);
	let addLoading = $state(false);
	let addError = $state<string | null>(null);
	let newEmail = $state('');
	let newFormationId = $state<number | null>(null);
	let newFname = $state('');
	let newLname = $state('');
	let newTel = $state('');
	let newCity = $state('');
	let newPostal = $state('');
	let newBirth = $state('');
	let newYear = $state('');

	function resetAddForm() {
		newEmail = '';
		newFormationId = null;
		newFname = '';
		newLname = '';
		newTel = '';
		newCity = '';
		newPostal = '';
		newBirth = '';
		newYear = '';
		addError = null;
	}

	async function submitAdd(e: SubmitEvent) {
		e.preventDefault();
		addError = null;
		if (!newEmail.trim()) {
			addError = 'Email requis.';
			return;
		}
		if (!newFormationId) {
			addError = 'Formation requise.';
			return;
		}
		const formEl = e.currentTarget as HTMLFormElement;
		const fd = new FormData(formEl);
		// Make sure the reactive state values win over any stale form value.
		fd.set('email', newEmail);
		fd.set('formationId', String(newFormationId));
		// Strip empty file inputs so the server-side hasCv/hasIdRecto check is clean.
		for (const key of ['cv', 'idDoc', 'idDocVerso']) {
			const v = fd.get(key);
			if (v instanceof File && v.size === 0) fd.delete(key);
		}
		addLoading = true;
		try {
			const res = await fetch('?/addStudent', { method: 'POST', body: fd });
			const json = await res.json().catch(() => null);
			const parsed = json?.data ? JSON.parse(json.data) : null;
			const payload = Array.isArray(parsed) ? parsed[0] : parsed;
			if (json?.type === 'failure' || json?.status >= 400) {
				addError = payload?.error ?? 'Erreur lors de la création.';
				return;
			}
			addOpen = false;
			resetAddForm();
			await invalidateAll();
			pushToast('Étudiant créé · mail de définition de mot de passe envoyé ✓', 'success');
		} catch (err) {
			console.error(err);
			addError = 'Erreur réseau.';
		} finally {
			addLoading = false;
		}
	}

	const statColor: Record<string, { bg: string; fg: string }> = {
		valide: { bg: C.greenLight, fg: C.green },
		en_attente: { bg: C.orangeLight, fg: C.orange },
		refuse: { bg: C.redLight, fg: C.red }
	};

	const RECHERCHE_CHIPS = [
		{ value: 'archive', label: 'Archive' },
		{ value: 'recherche', label: 'En recherche' },
		{ value: 'active', label: 'Recherche active' },
		{ value: 'entreprise', label: 'En entreprise' }
	];
	const STATUT_CHIPS = [
		{ value: 'en_attente', label: 'En attente' },
		{ value: 'valide', label: 'Validé' },
		{ value: 'refuse', label: 'Refusé' }
	];
	const YEAR_CHIPS = [1, 2, 3, 4, 5];
	const TRANCHE_CHIPS = [
		{ value: '0-17', label: '-18' },
		{ value: '18-20', label: '18 — 20' },
		{ value: '21-25', label: '21 — 25' },
		{ value: '26-29', label: '26 — 29' },
		{ value: '30-100', label: '30+' }
	];

	function toggle<T>(arr: T[], value: T): T[] {
		return arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
	}

	async function fetchPage(p: number) {
		loading = true;
		try {
			const effectivePlace = await resolvePlaceForSearch();
			const res = await fetch('/cre/etudiants/search', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					q,
					statut: selectedStatut,
					rechercheStatut: selectedRecherche,
					year: selectedYears,
					formationId: selectedFormations,
					place: effectivePlace,
					radiusKm: radius ? Number(radius) : undefined,
					postal,
					age: age ? Number(age) : null,
					trancheAge,
					permis,
					vehicule,
					mobile,
					tags: currentTags,
					skills: currentSkills,
					page: p,
					pageSize,
					sortBy,
					sortDir
				})
			});
			const data = await res.json();
			if (!data.success) return;
			rows = data.rows;
			page = data.page;
			total = data.total;
			totalPages = data.totalPages;
		} finally {
			loading = false;
		}
	}

	const debouncedSearch = debounce(() => fetchPage(1), 350);

	function setSort(key: SortKey) {
		if (sortBy === key) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		else {
			sortBy = key;
			sortDir = 'desc';
		}
		fetchPage(1);
	}

	function addTag() {
		const v = tagInput.trim();
		if (v && !currentTags.includes(v)) currentTags = [...currentTags, v];
		tagInput = '';
		debouncedSearch();
	}
	function addSkill() {
		const v = skillInput.trim();
		if (v && !currentSkills.includes(v)) currentSkills = [...currentSkills, v];
		skillInput = '';
		debouncedSearch();
	}
	function removeTag(t: string) {
		currentTags = currentTags.filter((x) => x !== t);
		debouncedSearch();
	}
	function removeSkill(s: string) {
		currentSkills = currentSkills.filter((x) => x !== s);
		debouncedSearch();
	}

	function reset() {
		q = '';
		selectedStatut = [];
		selectedRecherche = [];
		selectedYears = [];
		selectedFormations = [];
		place = '';
		radius = '5';
		postal = '';
		placeSuggestions = [];
		showPlaceSuggestions = false;
		age = '';
		trancheAge = '';
		permis = false;
		vehicule = false;
		mobile = false;
		currentTags = [];
		currentSkills = [];
		tagInput = '';
		skillInput = '';
		fetchPage(1);
	}

	async function submitStatut(id: number, statut: 'valide' | 'refuse') {
		const fd = new FormData();
		fd.set('id', String(id));
		fd.set('statut', statut);
		const res = await fetch('?/setStatut', { method: 'POST', body: fd });
		const result = deserialize(await res.text());
		if (result.type === 'failure') {
			const msg =
				(result.data?.error as string | undefined) ?? 'Action impossible.';
			pushToast(msg, 'error');
			return;
		}
		const r = rows.find((x) => x.id === id);
		if (r) r.statut = statut;
		rows = [...rows];
		pushToast(
			statut === 'valide' ? 'Dossier validé ✓' : 'Dossier refusé',
			statut === 'valide' ? 'success' : 'error'
		);
		await invalidateAll();
	}

	async function changeRechercheStatut(id: number, value: string) {
		const fd = new FormData();
		fd.set('id', String(id));
		fd.set('rechercheStatut', value);
		await fetch('?/setRechercheStatut', { method: 'POST', body: fd });
		const r = rows.find((x) => x.id === id);
		if (r) r.rechercheStatut = value;
		rows = [...rows];
	}

	function sortArrow(key: SortKey) {
		if (sortBy !== key) return '';
		return sortDir === 'asc' ? '▲' : '▼';
	}
</script>

<div class="cs-etu">
	<div class="cs-etu__topbar">
		<h2 class="cs-etu__title">👥 Étudiants <span>({total})</span></h2>
		<Button icon="＋" onclick={() => (addOpen = true)}>
			Ajouter un étudiant
		</Button>
	</div>

	<Card padding="18px" class="cs-etu__filters-card">
		<div class="cs-etu__search-row">
			<div class="cs-etu__search">
				<span class="cs-etu__search-icon">🔍</span>
				<input
					class="cs-etu__search-input"
					placeholder="Rechercher par nom ou prénom…"
					bind:value={q}
					oninput={debouncedSearch}
				/>
			</div>
			<Button size="sm" variant="subtle" onclick={reset}>Réinitialiser</Button>
		</div>

		<section class="cs-etu__section">
			<p class="cs-etu__section-title">🎓 Profil</p>
			{#if data.formations.length}
				<div class="cs-etu__filter-row">
					<span class="cs-etu__filter-lab">Formations</span>
					<div class="cs-etu__chips">
						{#each data.formations as f}
							<button
								class="cs-etu__chip"
								class:cs-etu__chip--active={selectedFormations.includes(f.id)}
								title={f.name}
								onclick={() => {
									selectedFormations = toggle(selectedFormations, f.id);
									debouncedSearch();
								}}
							>
								{f.code}
							</button>
						{/each}
					</div>
				</div>
			{/if}
			<div class="cs-etu__filter-row">
				<span class="cs-etu__filter-lab">Année</span>
				<div class="cs-etu__chips">
					{#each YEAR_CHIPS as y}
						<button
							class="cs-etu__chip"
							class:cs-etu__chip--active={selectedYears.includes(y)}
							onclick={() => {
								selectedYears = toggle(selectedYears, y);
								debouncedSearch();
							}}
						>
							Bac+{y}
						</button>
					{/each}
				</div>
			</div>
		</section>

		<section class="cs-etu__section">
			<p class="cs-etu__section-title">📋 Statuts</p>
			<div class="cs-etu__filter-row">
				<span class="cs-etu__filter-lab">Dossier</span>
				<div class="cs-etu__chips">
					{#each STATUT_CHIPS as c}
						<button
							class="cs-etu__chip"
							class:cs-etu__chip--active={selectedStatut.includes(c.value)}
							onclick={() => {
								selectedStatut = toggle(selectedStatut, c.value);
								debouncedSearch();
							}}
						>
							{c.label}
						</button>
					{/each}
				</div>
			</div>
			<div class="cs-etu__filter-row">
				<span class="cs-etu__filter-lab">Recherche</span>
				<div class="cs-etu__chips">
					{#each RECHERCHE_CHIPS as c}
						<button
							class="cs-etu__chip"
							class:cs-etu__chip--active={selectedRecherche.includes(c.value)}
							onclick={() => {
								selectedRecherche = toggle(selectedRecherche, c.value);
								debouncedSearch();
							}}
						>
							{c.label}
						</button>
					{/each}
				</div>
			</div>
		</section>

		<section class="cs-etu__section">
			<p class="cs-etu__section-title">📍 Localisation</p>
			<div class="cs-etu__inputs-row">
				<div class="cs-etu__place">
					<input
						class="cs-etu__input cs-etu__place-input"
						placeholder="Lieu (ville, adresse…)"
						bind:value={place}
						oninput={onPlaceInput}
						onkeydown={onPlaceKeydown}
						onfocus={() => (showPlaceSuggestions = true)}
						onblur={() => setTimeout(() => (showPlaceSuggestions = false), 150)}
						autocomplete="off"
					/>
					{#if showPlaceSuggestions && placeSuggestions.length > 0}
						<ul class="cs-etu__suggest" role="listbox">
							{#each placeSuggestions as s}
								<li>
									<button
										type="button"
										class="cs-etu__suggest-item"
										onmousedown={(e) => {
											e.preventDefault();
											pickPlaceSuggestion(s);
										}}
									>
										{s.label}
									</button>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
				<input
					class="cs-etu__input cs-etu__input--sm"
					placeholder="Rayon km"
					type="number"
					min="0"
					bind:value={radius}
					oninput={debouncedSearch}
				/>
				<input
					class="cs-etu__input cs-etu__input--sm"
					placeholder="Code postal"
					inputmode="numeric"
					maxlength="5"
					bind:value={postal}
					oninput={onPostalInput}
				/>
			</div>
		</section>

		<section class="cs-etu__section">
			<p class="cs-etu__section-title">👤 Démographie & mobilité</p>
			<div class="cs-etu__inputs-row">
				<input
					class="cs-etu__input cs-etu__input--sm"
					placeholder="Âge"
					type="number"
					min="0"
					max="100"
					bind:value={age}
					oninput={debouncedSearch}
				/>
			</div>
			<div class="cs-etu__filter-row">
				<span class="cs-etu__filter-lab">Tranche d'âge</span>
				<div class="cs-etu__chips">
					{#each TRANCHE_CHIPS as t}
						<button
							class="cs-etu__chip"
							class:cs-etu__chip--active={trancheAge === t.value}
							onclick={() => {
								trancheAge = trancheAge === t.value ? '' : t.value;
								debouncedSearch();
							}}
						>
							{t.label}
						</button>
					{/each}
				</div>
			</div>
			<div class="cs-etu__filter-row">
				<span class="cs-etu__filter-lab">Mobilité</span>
				<div class="cs-etu__chips">
					<button
						class="cs-etu__chip"
						class:cs-etu__chip--active={permis}
						onclick={() => {
							permis = !permis;
							debouncedSearch();
						}}
					>
						Permis
					</button>
					<button
						class="cs-etu__chip"
						class:cs-etu__chip--active={vehicule}
						onclick={() => {
							vehicule = !vehicule;
							debouncedSearch();
						}}
					>
						Véhiculé
					</button>
					<button
						class="cs-etu__chip"
						class:cs-etu__chip--active={mobile}
						onclick={() => {
							mobile = !mobile;
							debouncedSearch();
						}}
					>
						Déménagement possible
					</button>
				</div>
			</div>
		</section>

		<section class="cs-etu__section">
			<p class="cs-etu__section-title">🏷️ Tags & compétences</p>
			<div class="cs-etu__wrapper">
				<span class="cs-etu__filter-lab">Tags</span>
				<input
					class="cs-etu__input cs-etu__input--inline"
					placeholder="Ajouter un tag puis Entrée"
					list="tagList"
					bind:value={tagInput}
					onchange={addTag}
					onkeydown={(e) => {
						if (e.key === 'Enter') {
							e.preventDefault();
							addTag();
						}
					}}
				/>
				<datalist id="tagList">
					{#each data.defaultTags as t}<option value={t}></option>{/each}
				</datalist>
				<div class="cs-etu__chips">
					{#each currentTags as t}
						<button class="cs-etu__chip cs-etu__chip--removable" onclick={() => removeTag(t)}>
							{t} <span>×</span>
						</button>
					{/each}
				</div>
			</div>
			<div class="cs-etu__wrapper">
				<span class="cs-etu__filter-lab">Compétences</span>
				<input
					class="cs-etu__input cs-etu__input--inline"
					placeholder="Ajouter une compétence puis Entrée"
					list="skillList"
					bind:value={skillInput}
					onchange={addSkill}
					onkeydown={(e) => {
						if (e.key === 'Enter') {
							e.preventDefault();
							addSkill();
						}
					}}
				/>
				<datalist id="skillList">
					{#each data.defaultSkills as s}<option value={s}></option>{/each}
				</datalist>
				<div class="cs-etu__chips">
					{#each currentSkills as s}
						<button class="cs-etu__chip cs-etu__chip--removable" onclick={() => removeSkill(s)}>
							{s} <span>×</span>
						</button>
					{/each}
				</div>
			</div>
		</section>
	</Card>

	<Card padding="0" class="cs-etu__list-card">
		<div class="cs-etu__list-head">
			<button class="cs-etu__head-cell cs-etu__head-cell--name" onclick={() => setSort('name')}>
				Étudiant <span>{sortArrow('name')}</span>
			</button>
			<button class="cs-etu__head-cell cs-etu__head-cell--score" onclick={() => setSort('score')}>
				Score <span>{sortArrow('score')}</span>
			</button>
			<button class="cs-etu__head-cell cs-etu__head-cell--city" onclick={() => setSort('city')}>
				Ville <span>{sortArrow('city')}</span>
			</button>
			<button class="cs-etu__head-cell cs-etu__head-cell--status" onclick={() => setSort('statut')}>
				Statut <span>{sortArrow('statut')}</span>
			</button>
			<button class="cs-etu__head-cell cs-etu__head-cell--date" onclick={() => setSort('createdAt')}>
				Créé <span>{sortArrow('createdAt')}</span>
			</button>
		</div>

		{#if rows.length === 0}
			<div class="cs-etu__empty">
				<Empty icon="👥" title="Aucun étudiant" sub="Aucun résultat pour ces filtres." />
			</div>
		{:else}
			{#each rows as r (r.id)}
				{@const sc = statColor[r.statut] ?? { bg: C.bg, fg: C.muted }}
				<div class="cs-etu__row" class:cs-etu__row--loading={loading}>
					<button class="cs-etu__cell cs-etu__cell--name" onclick={() => openEdit(r)}>
						<div class="cs-etu__avatar">{initials(r.name)}</div>
						<div>
							<p class="cs-etu__name">{r.lname.toUpperCase()} {r.fname}</p>
							<p class="cs-etu__sub">
								{r.formation}{#if r.formationCode} <span class="cs-etu__formation">({r.formationCode})</span>{/if}
								{#if r.year} · Bac+{r.year}{/if}
							</p>
							<p class="cs-etu__rowtags">
								<span>📄 {r.cvs.length} CV</span>
								{#if r.pitch}<span>🎥 Pitch</span>{/if}
							</p>
						</div>
					</button>
					<div class="cs-etu__cell cs-etu__cell--score" style:color={scoreColor(r.score)}>
						{r.score ?? '—'}
					</div>
					<div class="cs-etu__cell cs-etu__cell--city">
						<span>{r.city || '—'}{#if r.postal} ({r.postal}){/if}</span>
						{#if r.distanceKm != null}
							<small>{r.distanceKm.toFixed(0)} km</small>
						{/if}
					</div>
					<div class="cs-etu__cell cs-etu__cell--status">
						<select
							class="cs-etu__select"
							value={r.rechercheStatut}
							onchange={(e) => changeRechercheStatut(r.id, e.currentTarget.value)}
						>
							{#each RECHERCHE_CHIPS as c}
								<option value={c.value}>{c.label}</option>
							{/each}
						</select>
						<Badge label={statutLabel(r.statut)} color={sc.bg} textColor={sc.fg} />
					</div>
					<div class="cs-etu__cell cs-etu__cell--date">
						<span>{r.createdAt.slice(0, 10)}</span>
						<div class="cs-etu__actions">
							<Button size="sm" variant="subtle" icon="👁" onclick={() => openPreview(r)}>
								Aperçu
							</Button>
							{#if r.statut === 'en_attente'}
								<Button
									size="sm"
									onclick={() =>
										(confirmTarget = { id: r.id, action: 'valide', name: r.name })}
								>
									Valider
								</Button>
								<Button
									size="sm"
									variant="danger"
									onclick={() =>
										(confirmTarget = { id: r.id, action: 'refuse', name: r.name })}
								>
									Refuser
								</Button>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		{/if}

		<div class="cs-etu__pages">
			<button
				class="cs-etu__page-btn"
				disabled={page <= 1 || loading}
				onclick={() => fetchPage(page - 1)}
			>
				‹
			</button>
			<span class="cs-etu__page-info">{page} / {totalPages}</span>
			<button
				class="cs-etu__page-btn"
				disabled={page >= totalPages || loading}
				onclick={() => fetchPage(page + 1)}
			>
				›
			</button>
		</div>
	</Card>
</div>

<Confirm
	open={!!confirmTarget}
	onclose={() => (confirmTarget = null)}
	danger={confirmTarget?.action === 'refuse'}
	title={confirmTarget?.action === 'valide' ? 'Valider ce dossier ?' : 'Refuser ce dossier ?'}
	message={confirmTarget?.action === 'valide'
		? `${confirmTarget?.name} sera notifié et son dossier envoyé aux entreprises.`
		: `${confirmTarget?.name} sera notifié du refus.`}
	onconfirm={async () => {
		if (!confirmTarget) return;
		await submitStatut(confirmTarget.id, confirmTarget.action);
	}}
/>

<CandidatDetail
	candidat={detail}
	open={!!detail}
	onclose={() => {
		detail = null;
		previewMode = false;
	}}
	editable={!previewMode}
	formations={data.formations}
	tagSuggestions={data.defaultTags}
	skillSuggestions={data.defaultSkills}
	onsaved={async () => {
		await invalidateAll();
		await fetchPage(page);
	}}
	deleteLabel="Supprimer le compte"
	deleteConfirmTitle={detail ? `Supprimer ${detail.name} ?` : 'Supprimer'}
	deleteConfirmMessage="Le compte, le dossier et tous les fichiers seront effacés définitivement."
	resetLabel="Envoyer un lien de reset"
	onresetpassword={detail
		? async () => {
				const d = detail;
				if (!d) return;
				const fd = new FormData();
				fd.set('id', String(d.id));
				const res = await fetch('?/sendReset', { method: 'POST', body: fd });
				if (res.ok) {
					pushToast(`Lien de réinitialisation envoyé à ${d.email}`, 'success');
				} else {
					pushToast("Échec de l'envoi du lien de reset", 'error');
				}
			}
		: undefined}
	ondelete={detail
		? async () => {
				const d = detail;
				if (!d) return;
				const fd = new FormData();
				fd.set('id', String(d.id));
				const res = await fetch('?/deleteStudent', { method: 'POST', body: fd });
				if (res.ok) {
					pushToast(`${d.name} supprimé`, 'info');
					detail = null;
					await invalidateAll();
					await fetchPage(page);
				} else {
					pushToast('Erreur lors de la suppression', 'error');
				}
			}
		: undefined}
>
	{#snippet footer()}
		{#if detail && detail.statut === 'en_attente'}
			{@const d = detail}
			<div class="cs-etu__detail-actions">
				<Button
					fullWidth
					onclick={async () => {
						await submitStatut(d.id, 'valide');
						detail = null;
					}}
				>
					Valider le dossier
				</Button>
				<Button
					fullWidth
					variant="danger"
					onclick={async () => {
						await submitStatut(d.id, 'refuse');
						detail = null;
					}}
				>
					Refuser
				</Button>
			</div>
		{/if}
	{/snippet}
</CandidatDetail>

<Modal
	open={addOpen}
	onclose={() => {
		addOpen = false;
		resetAddForm();
	}}
	title="Ajouter un étudiant"
	width={560}
>
	<form class="cs-add" enctype="multipart/form-data" onsubmit={submitAdd}>
		<p class="cs-add__lead">
			L'étudiant recevra un email pour définir son mot de passe. Son dossier sera en attente de validation.
		</p>

		<div class="cs-add__row">
			<Input
				label="Email"
				name="email"
				type="email"
				bind:value={newEmail}
				placeholder="prenom@email.fr"
				required
				autofocus
			/>
			<div class="cs-field">
				<label class="cs-add__lab" for="add-formation">Formation<span class="cs-add__req">*</span></label>
				<select
					id="add-formation"
					class="cs-add__select"
					value={newFormationId ?? ''}
					onchange={(e) => (newFormationId = Number((e.target as HTMLSelectElement).value) || null)}
					required
				>
					<option value="" disabled>— Choisir —</option>
					{#each data.formations as f}
						<option value={f.id}>{f.code} — {f.name}</option>
					{/each}
				</select>
			</div>
		</div>

		<p class="cs-add__optional">Informations complémentaires (optionnelles)</p>

		<div class="cs-add__row">
			<Input label="Prénom" name="fname" bind:value={newFname} placeholder="Léa" />
			<Input label="Nom" name="lname" bind:value={newLname} placeholder="Martin" />
		</div>
		<div class="cs-add__row">
			<Input label="Téléphone" name="tel" type="tel" bind:value={newTel} placeholder="06 12 34 56 78" />
			<Input label="Date de naissance" name="birth" type="date" bind:value={newBirth} />
		</div>
		<div class="cs-add__row">
			<Input label="Ville" name="city" bind:value={newCity} placeholder="Paris" />
			<Input label="Code postal" name="postal" bind:value={newPostal} placeholder="75001" />
		</div>
		<div class="cs-add__row">
			<div class="cs-field">
				<label class="cs-add__lab" for="add-year">Année</label>
				<select
					id="add-year"
					class="cs-add__select"
					value={newYear}
					onchange={(e) => (newYear = (e.target as HTMLSelectElement).value)}
				>
					<option value="">—</option>
					<option value="1">1</option>
					<option value="2">2</option>
					<option value="3">3</option>
					<option value="4">4</option>
					<option value="5">5</option>
				</select>
			</div>
			<div></div>
		</div>

		<p class="cs-add__optional">Documents (optionnels)</p>
		<div class="cs-add__docs">
			<FileUpload
				label="CV"
				name="cv"
				accept=".pdf"
				hint="PDF · 5 Mo max"
				maxSizeMB={5}
			/>
			<FileUpload
				label="Pièce d'identité (recto)"
				name="idDoc"
				accept=".pdf,.png,.jpg,.jpeg,.webp"
				hint="PDF ou image · 5 Mo max"
				maxSizeMB={5}
			/>
			<FileUpload
				label="Pièce d'identité (verso)"
				name="idDocVerso"
				accept=".pdf,.png,.jpg,.jpeg,.webp"
				hint="PDF ou image · 5 Mo max"
				maxSizeMB={5}
			/>
		</div>

		{#if addError}
			<div class="cs-add__err">⚠ {addError}</div>
		{/if}

		<div class="cs-add__actions">
			<Button
				variant="ghost"
				type="button"
				onclick={() => {
					addOpen = false;
					resetAddForm();
				}}
			>
				Annuler
			</Button>
			<Button variant="primary" type="submit" disabled={addLoading}>
				{addLoading ? 'Création…' : 'Créer & envoyer le mail'}
			</Button>
		</div>
	</form>
</Modal>

<style>
	.cs-etu {
		max-width: 1100px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.cs-etu__topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}
	.cs-etu__title {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 18px;
		color: var(--c-text);
	}
	.cs-etu__title span {
		color: var(--c-muted);
		font-weight: 600;
	}
	:global(.cs-etu__filters-card) {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.cs-etu__search-row {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.cs-etu__search {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 0 12px;
		border-radius: 10px;
		border: 1.5px solid var(--c-border);
		background: var(--c-card);
		min-width: 0;
	}
	.cs-etu__search:focus-within {
		border-color: var(--c-blue);
	}
	.cs-etu__search-icon {
		font-size: 14px;
		color: var(--c-muted);
	}
	.cs-etu__search-input {
		flex: 1;
		min-width: 0;
		padding: 10px 0;
		border: none;
		outline: none;
		background: transparent;
		font-size: 14px;
		color: var(--c-text);
		font-family: var(--font-body);
	}
	.cs-etu__section {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding-top: 12px;
		border-top: 1px solid var(--c-border);
	}
	.cs-etu__section-title {
		font-family: var(--font-display);
		font-size: 12px;
		font-weight: 700;
		color: var(--c-sub);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
	.cs-etu__filter-row {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}
	.cs-etu__filter-lab {
		font-size: 12px;
		font-weight: 600;
		color: var(--c-muted);
		min-width: 100px;
	}
	.cs-etu__chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.cs-etu__chip {
		padding: 5px 12px;
		border-radius: 99px;
		border: 1.5px solid var(--c-border);
		background: var(--c-card);
		color: var(--c-muted);
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
		font-family: var(--font-body);
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}
	.cs-etu__chip:hover {
		border-color: var(--c-blue);
		color: var(--c-blue);
	}
	.cs-etu__chip--active {
		background: var(--c-blue);
		color: #fff;
		border-color: var(--c-blue);
	}
	.cs-etu__chip--removable span {
		font-size: 14px;
		line-height: 1;
	}
	.cs-etu__inputs-row {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}
	.cs-etu__input {
		flex: 1;
		min-width: 140px;
		padding: 8px 12px;
		border-radius: 9px;
		border: 1.5px solid var(--c-border);
		font-size: 13px;
		outline: none;
		background: var(--c-card);
		color: var(--c-text);
		font-family: var(--font-body);
	}
	.cs-etu__input:focus {
		border-color: var(--c-blue);
	}
	.cs-etu__input--sm {
		flex: 0 0 130px;
	}
	.cs-etu__place {
		position: relative;
		flex: 1;
		min-width: 140px;
		display: flex;
	}
	.cs-etu__place-input {
		flex: 1;
		min-width: 0;
	}
	.cs-etu__suggest {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		right: 0;
		z-index: 20;
		margin: 0;
		padding: 4px;
		list-style: none;
		background: var(--c-card);
		border: 1.5px solid var(--c-border);
		border-radius: 9px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
		max-height: 220px;
		overflow-y: auto;
	}
	.cs-etu__suggest-item {
		width: 100%;
		text-align: left;
		padding: 8px 10px;
		border: none;
		background: none;
		border-radius: 6px;
		font-size: 13px;
		color: var(--c-text);
		font-family: var(--font-body);
		cursor: pointer;
	}
	.cs-etu__suggest-item:hover {
		background: var(--c-bg);
		color: var(--c-blue);
	}
	.cs-etu__input--inline {
		flex: 0 0 240px;
	}
	.cs-etu__wrapper {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}
	:global(.cs-etu__list-card) {
		overflow: hidden;
	}
	.cs-etu__list-head {
		display: grid;
		grid-template-columns: 2.2fr 0.6fr 1.2fr 1.4fr 1.2fr;
		gap: 8px;
		padding: 12px 16px;
		background: var(--c-bg);
		border-bottom: 1px solid var(--c-border);
	}
	.cs-etu__head-cell {
		background: none;
		border: none;
		padding: 0;
		text-align: left;
		font-size: 11px;
		font-weight: 700;
		color: var(--c-sub);
		text-transform: uppercase;
		letter-spacing: 0.4px;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 4px;
		font-family: var(--font-body);
	}
	.cs-etu__head-cell span {
		color: var(--c-blue);
	}
	.cs-etu__head-cell--score {
		justify-content: center;
	}
	.cs-etu__row {
		display: grid;
		grid-template-columns: 2.2fr 0.6fr 1.2fr 1.4fr 1.2fr;
		gap: 8px;
		padding: 14px 16px;
		border-bottom: 1px solid var(--c-border);
		align-items: center;
		transition: opacity 0.15s;
	}
	.cs-etu__row:last-of-type {
		border-bottom: none;
	}
	.cs-etu__row--loading {
		opacity: 0.5;
	}
	.cs-etu__cell {
		font-size: 13px;
		color: var(--c-text);
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.cs-etu__cell--name {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 12px;
		background: none;
		border: none;
		padding: 0;
		text-align: left;
		cursor: pointer;
		font-family: var(--font-body);
	}
	.cs-etu__cell--score {
		font-size: 18px;
		font-weight: 700;
		text-align: center;
		justify-content: center;
	}
	.cs-etu__cell--city small {
		color: var(--c-muted);
		font-size: 11px;
	}
	.cs-etu__cell--date {
		font-size: 12px;
		color: var(--c-muted);
	}
	.cs-etu__avatar {
		width: 36px;
		height: 36px;
		border-radius: 10px;
		background: var(--c-blue-light);
		display: grid;
		place-items: center;
		font-weight: 700;
		color: var(--c-blue);
		font-size: 12px;
		flex-shrink: 0;
	}
	.cs-etu__name {
		font-weight: 600;
		font-size: 13px;
		color: var(--c-text);
	}
	.cs-etu__sub {
		font-size: 11px;
		color: var(--c-muted);
		margin-top: 2px;
	}
	.cs-etu__rowtags {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		margin-top: 4px;
		font-size: 11px;
		color: var(--c-sub);
	}
	.cs-etu__rowtags span {
		background: var(--c-bg);
		border-radius: 6px;
		padding: 1px 6px;
	}
	.cs-etu__formation {
		color: var(--c-blue);
		font-weight: 600;
	}
	.cs-etu__select {
		padding: 5px 8px;
		border-radius: 7px;
		border: 1px solid var(--c-border);
		font-size: 12px;
		background: var(--c-card);
		color: var(--c-text);
		cursor: pointer;
		font-family: var(--font-body);
	}
	.cs-etu__actions {
		display: flex;
		gap: 6px;
		margin-top: 6px;
	}
	.cs-etu__empty {
		padding: 30px 16px;
	}
	.cs-etu__pages {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		padding: 14px;
		border-top: 1px solid var(--c-border);
	}
	.cs-etu__page-btn {
		width: 32px;
		height: 32px;
		border-radius: 8px;
		border: 1.5px solid var(--c-border);
		background: var(--c-card);
		color: var(--c-sub);
		cursor: pointer;
		font-size: 14px;
		font-weight: 700;
	}
	.cs-etu__page-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.cs-etu__page-info {
		font-size: 13px;
		color: var(--c-sub);
		font-weight: 600;
	}
	.cs-etu__detail-actions {
		margin-top:1rem;
		display: flex;
		gap: 10px;
	}
	@media (max-width: 720px) {
		.cs-etu__list-head,
		.cs-etu__row {
			grid-template-columns: 1fr;
		}
		.cs-etu__list-head {
			display: none;
		}
		.cs-etu__row {
			padding: 14px;
			gap: 10px;
		}
		.cs-etu__cell {
			width: 100%;
		}
		.cs-etu__cell--score {
			justify-content: flex-start;
			text-align: left;
			font-size: 16px;
			flex-direction: row;
			align-items: center;
		}
		.cs-etu__cell--score::before {
			content: 'Score : ';
			font-size: 11px;
			font-weight: 700;
			color: var(--c-muted);
			text-transform: uppercase;
			letter-spacing: 0.4px;
			margin-right: 6px;
		}
		.cs-etu__cell--city {
			flex-direction: row;
			gap: 8px;
			align-items: baseline;
			color: var(--c-sub);
			font-size: 12px;
		}
		.cs-etu__cell--status {
			flex-direction: row;
			gap: 8px;
			flex-wrap: wrap;
			align-items: center;
		}
		.cs-etu__cell--date {
			flex-direction: row;
			gap: 10px;
			flex-wrap: wrap;
			align-items: center;
		}
		.cs-etu__actions {
			margin-top: 0;
		}
		.cs-etu__select {
			max-width: 100%;
		}
	}
	@media (max-width: 640px) {
		.cs-etu__filter-lab {
			min-width: 0;
			flex: 1 0 100%;
		}
		.cs-etu__topbar {
			align-items: flex-start;
			flex-wrap: wrap;
		}
		.cs-etu__title {
			font-size: 17px;
		}
		.cs-etu__input,
		.cs-etu__input--sm,
		.cs-etu__input--inline {
			flex: 1 1 100%;
			min-width: 0;
		}
		.cs-etu__inputs-row {
			gap: 8px;
		}
		.cs-etu__detail-actions {
			flex-direction: column;
		}
	}

	.cs-add {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.cs-add__lead {
		font-size: 13px;
		color: var(--c-muted);
		line-height: 1.5;
	}
	.cs-add__optional {
		font-size: 12px;
		font-weight: 600;
		color: var(--c-muted);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin-top: 6px;
	}
	.cs-add__row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}
	.cs-add__lab {
		font-size: 13px;
		font-weight: 600;
		color: var(--c-sub);
		display: block;
		margin-bottom: 5px;
	}
	.cs-add__req {
		color: var(--c-red);
		margin-left: 3px;
	}
	.cs-add__select {
		width: 100%;
		padding: 10px 14px;
		border-radius: 9px;
		border: 1.5px solid var(--c-border);
		background: var(--c-card);
		color: var(--c-text);
		font-family: var(--font-body);
		font-size: 14px;
		outline: none;
	}
	.cs-add__select:focus {
		border-color: var(--c-blue);
	}
	.cs-add__err {
		background: var(--c-red-light);
		color: var(--c-red);
		font-size: 13px;
		padding: 10px 14px;
		border-radius: 8px;
	}
	.cs-add__docs {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.cs-add__actions {
		display: flex;
		gap: 10px;
		justify-content: flex-end;
		margin-top: 8px;
	}
	@media (max-width: 540px) {
		.cs-add__row {
			grid-template-columns: 1fr;
		}
	}
</style>
