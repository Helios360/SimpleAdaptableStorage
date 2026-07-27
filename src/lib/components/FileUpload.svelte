<script lang="ts">
	interface Props {
		label: string;
		name: string;
		accept: string;
		hint?: string;
		/** Précision permanente sur la pièce attendue (recto/verso, nb de pages…). */
		note?: string;
		required?: boolean;
		maxSizeMB?: number;
		error?: string;
	}

	let { label, name, accept, hint, note, required = false, maxSizeMB, error }: Props = $props();

	let fileName = $state<string | null>(null);
	let input: HTMLInputElement | undefined = $state();
	let sizeError = $state<string | null>(null);

	function onChange() {
		const f = input?.files?.[0];
		if (!f) {
			fileName = null;
			sizeError = null;
			return;
		}
		if (maxSizeMB && f.size > maxSizeMB * 1024 * 1024) {
			sizeError = `Fichier trop volumineux (max ${maxSizeMB} Mo).`;
			if (input) input.value = '';
			fileName = null;
			return;
		}
		sizeError = null;
		fileName = f.name;
	}

	function clear() {
		if (input) input.value = '';
		fileName = null;
		sizeError = null;
	}
</script>

<div class="cs-file" class:cs-file--has={!!fileName} class:cs-file--err={!!(error || sizeError)}>
	<label class="cs-file__main" for={name}>
		<span class="cs-file__icon" aria-hidden="true">
			{#if fileName}📎{:else}⬆{/if}
		</span>
		<span class="cs-file__text">
			<span class="cs-label">
				{label}{#if required}<span class="cs-req">*</span>{/if}
			</span>
			{#if note}<span class="cs-file__note">{note}</span>{/if}
			<span class="cs-file__name">
				{fileName ?? hint ?? 'Choisir un fichier'}
			</span>
		</span>
	</label>
	{#if fileName}
		<button type="button" class="cs-file__clear" onclick={clear} aria-label="Retirer le fichier">×</button>
	{/if}
	<input
		bind:this={input}
		id={name}
		{name}
		{accept}
		{required}
		type="file"
		onchange={onChange}
		class="cs-file__input"
	/>
	{#if sizeError || error}
		<span class="cs-field-error cs-file__error">⚠ {sizeError ?? error}</span>
	{/if}
</div>

<style>
	.cs-file {
		position: relative;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		padding: 10px 14px;
		border-radius: 9px;
		border: 1.5px dashed var(--c-border-mid);
		background: var(--c-card);
		transition: border-color 0.12s, background 0.12s;
	}
	.cs-file:hover {
		border-color: var(--c-blue);
	}
	.cs-file--has {
		border-style: solid;
		border-color: var(--c-blue);
		background: var(--c-blue-soft);
	}
	.cs-file--err {
		border-color: var(--c-red);
	}
	.cs-file__main {
		display: flex;
		align-items: center;
		gap: 10px;
		flex: 1;
		min-width: 0;
		cursor: pointer;
	}
	.cs-file__icon {
		font-size: 18px;
		flex-shrink: 0;
	}
	.cs-file__text {
		display: flex;
		flex-direction: column;
		min-width: 0;
		flex: 1;
	}
	.cs-file__note {
		font-size: 12px;
		font-weight: 700;
		color: var(--c-blue);
		white-space: normal;
	}
	.cs-file__name {
		font-size: 12px;
		color: var(--c-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.cs-file--has .cs-file__name {
		color: var(--c-blue);
		font-weight: 500;
	}
	.cs-file__clear {
		flex-shrink: 0;
		width: 26px;
		height: 26px;
		border-radius: 50%;
		border: none;
		background: var(--c-red-light);
		color: var(--c-red);
		font-size: 16px;
		line-height: 1;
		cursor: pointer;
		display: grid;
		place-items: center;
	}
	.cs-file__clear:hover {
		background: var(--c-red);
		color: #fff;
	}
	.cs-file__input {
		position: absolute;
		inset: 0;
		opacity: 0;
		pointer-events: none;
	}
	.cs-file__error {
		width: 100%;
	}
</style>
