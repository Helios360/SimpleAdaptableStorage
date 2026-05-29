<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import Button from '$lib/components/Button.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Empty from '$lib/components/Empty.svelte';
	import Input from '$lib/components/Input.svelte';
	import { MSG_TEMPLATES, fillTemplate, type MessageTemplate } from '$lib/data/templates';
	import { pushToast } from '$lib/stores/toast.svelte';
	import { C } from '$lib/tokens';

	type Cat = 'Tous' | 'Entreprise' | 'Candidat';
	const cats: Cat[] = ['Tous', 'Entreprise', 'Candidat'];
	let cat = $state<Cat>('Tous');

	let active = $state<MessageTemplate | null>(null);
	let values = $state<Record<string, string>>({});
	let subject = $state('');
	let body = $state('');
	let copied = $state(false);

	const list = $derived(
		cat === 'Tous' ? MSG_TEMPLATES : MSG_TEMPLATES.filter((t) => t.cat === cat)
	);

	function openTemplate(t: MessageTemplate) {
		const init: Record<string, string> = {};
		for (const v of t.vars) init[v.k] = v.def;
		values = init;
		subject = fillTemplate(t.subject, init);
		body = fillTemplate(t.body, init);
		active = t;
		copied = false;
	}

	function updateVar(k: string, val: string) {
		if (!active) return;
		values = { ...values, [k]: val };
		subject = fillTemplate(active.subject, values);
		body = fillTemplate(active.body, values);
	}

	async function copy() {
		const full = `Objet : ${subject}\n\n${body}`;
		try {
			await navigator.clipboard.writeText(full);
		} catch {
			// ignore
		}
		copied = true;
		pushToast('Message copié dans le presse-papier ✓');
		setTimeout(() => (copied = false), 2000);
	}
</script>

<div class="cs-msg">
	<p class="cs-msg__lead">Choisissez un modèle, personnalisez les variables, puis copiez ou envoyez.</p>

	<div class="cs-msg__cols">
		<div class="cs-msg__left">
			<div class="cs-msg__cats">
				{#each cats as c}
					<button
						class="cs-msg__cat"
						class:cs-msg__cat--active={cat === c}
						onclick={() => (cat = c)}
					>
						{c}
					</button>
				{/each}
			</div>
			<div class="cs-msg__list">
				{#each list as t (t.id)}
					<Card
						padding="14px 16px"
						clickable
						onclick={() => openTemplate(t)}
						class="cs-msg__tpl"
						style={active?.id === t.id ? `border:2px solid ${C.purple};background:${C.purpleLight}` : ''}
					>
						<span class="cs-msg__icon">{t.icon}</span>
						<div class="cs-msg__tpl-body">
							<p class="cs-msg__tpl-name">{t.label}</p>
							<p class="cs-msg__tpl-desc">{t.desc}</p>
						</div>
						<Badge
							label={t.cat}
							color={t.cat === 'Candidat' ? C.blueLight : C.orangeLight}
							textColor={t.cat === 'Candidat' ? C.blue : C.orange}
						/>
					</Card>
				{/each}
			</div>
		</div>

		<div class="cs-msg__right">
			{#if !active}
				<Card padding="0">
					<Empty icon="✉️" title="Aucun modèle sélectionné" sub="Choisissez un modèle à gauche pour commencer." />
				</Card>
			{:else}
				<Card padding="22px">
					<p class="cs-msg__compose-title">{active.icon} {active.label}</p>

					{#if active.vars.length > 0}
						<div class="cs-msg__vars">
							{#each active.vars as v (v.k)}
								<Input
									label={v.label}
									name={v.k}
									value={values[v.k] ?? ''}
									oninput={(e) => updateVar(v.k, (e.currentTarget as HTMLInputElement).value)}
								/>
							{/each}
						</div>
					{/if}

					<div class="cs-msg__field">
						<label class="cs-msg__lab" for="msg-subject">Objet</label>
						<input id="msg-subject" class="cs-msg__input" bind:value={subject} />
					</div>

					<div class="cs-msg__field">
						<label class="cs-msg__lab" for="msg-body">Message</label>
						<textarea id="msg-body" class="cs-msg__textarea" rows="12" bind:value={body}></textarea>
					</div>

					<div class="cs-msg__actions">
						<Button variant="subtle" icon={copied ? '✓' : '📋'} onclick={copy}>
							{copied ? 'Copié' : 'Copier'}
						</Button>
						<Button fullWidth icon="📨" onclick={() => pushToast('Message envoyé ✓')}>Envoyer</Button>
					</div>
				</Card>
			{/if}
		</div>
	</div>
</div>

<style>
	.cs-msg {
		max-width: 1100px;
	}
	.cs-msg__lead {
		color: var(--c-muted);
		font-size: 13px;
		margin-bottom: 20px;
	}
	.cs-msg__cols {
		display: flex;
		gap: 20px;
		flex-wrap: wrap;
		align-items: flex-start;
	}
	.cs-msg__left {
		flex: 1 1 320px;
		min-width: 0;
	}
	.cs-msg__right {
		flex: 1 1 420px;
		min-width: 0;
		position: sticky;
		top: 80px;
	}
	.cs-msg__cats {
		display: flex;
		gap: 8px;
		margin-bottom: 14px;
		flex-wrap: wrap;
	}
	.cs-msg__cat {
		padding: 6px 14px;
		border-radius: 99px;
		border: 1.5px solid var(--c-border);
		background: var(--c-card);
		color: var(--c-muted);
		font-family: var(--font-body);
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
	}
	.cs-msg__cat--active {
		background: var(--c-purple);
		color: #fff;
		border-color: var(--c-purple);
	}
	.cs-msg__list {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	:global(.cs-msg__tpl) {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.cs-msg__icon {
		font-size: 22px;
	}
	.cs-msg__tpl-body {
		flex: 1;
	}
	.cs-msg__tpl-name {
		font-weight: 600;
		font-size: 14px;
		color: var(--c-text);
	}
	.cs-msg__tpl-desc {
		font-size: 12px;
		color: var(--c-muted);
		margin-top: 2px;
	}
	.cs-msg__compose-title {
		font-family: var(--font-display);
		font-weight: 700;
		font-size: 15px;
		color: var(--c-text);
		margin-bottom: 16px;
	}
	.cs-msg__vars {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
		margin-bottom: 18px;
	}
	.cs-msg__field {
		margin-bottom: 12px;
	}
	.cs-msg__lab {
		font-size: 13px;
		font-weight: 600;
		color: var(--c-sub);
	}
	.cs-msg__input,
	.cs-msg__textarea {
		width: 100%;
		margin-top: 5px;
		padding: 10px 14px;
		border-radius: 9px;
		border: 1.5px solid var(--c-border);
		background: var(--c-card);
		font-family: var(--font-body);
		font-size: 14px;
		color: var(--c-text);
		outline: none;
	}
	.cs-msg__textarea {
		padding: 12px 14px;
		font-size: 13.5px;
		resize: vertical;
		line-height: 1.6;
	}
	.cs-msg__actions {
		display: flex;
		gap: 10px;
	}
	@media (max-width: 820px) {
		.cs-msg__right {
			position: static;
			top: auto;
		}
	}
	@media (max-width: 540px) {
		.cs-msg__vars {
			grid-template-columns: 1fr;
		}
		.cs-msg__actions {
			flex-direction: column;
		}
	}
</style>
