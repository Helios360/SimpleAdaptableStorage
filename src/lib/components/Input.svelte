<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends Omit<HTMLInputAttributes, 'value'> {
		label?: string;
		value?: string;
		error?: string;
		/** Texte d'aide affiché sous le champ. */
		hint?: string;
		/** N'autorise que des chiffres : filtre la saisie en retirant tout caractère non numérique. */
		digitsOnly?: boolean;
	}

	let {
		label,
		value = $bindable(''),
		error,
		hint,
		name,
		type = 'text',
		required,
		placeholder,
		autofocus,
		digitsOnly = false,
		...rest
	}: Props = $props();

	function handleInput() {
		if (digitsOnly) {
			const cleaned = value.replace(/\D/g, '');
			if (cleaned !== value) value = cleaned;
		}
	}
</script>

<div class="cs-field">
	{#if label}
		<label for={name} class="cs-label">
			{label}{#if required}<span class="cs-req">*</span>{/if}
		</label>
	{/if}
	<!-- svelte-ignore a11y_autofocus -->
	<input
		id={name}
		{name}
		{type}
		{placeholder}
		{autofocus}
		{required}
		bind:value
		oninput={handleInput}
		aria-invalid={!!error}
		aria-required={required}
		class="cs-input {error ? 'cs-input--error' : ''}"
		{...rest}
	/>
	{#if hint}<span class="cs-field-hint">{hint}</span>{/if}
	{#if error}<span class="cs-field-error">⚠ {error}</span>{/if}
</div>
