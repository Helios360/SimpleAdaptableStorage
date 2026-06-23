<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends Omit<HTMLInputAttributes, 'value'> {
		label?: string;
		value?: string;
		error?: string;
	}

	let {
		label,
		value = $bindable(''),
		error,
		name,
		type = 'text',
		required,
		placeholder,
		autofocus,
		...rest
	}: Props = $props();
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
		aria-invalid={!!error}
		aria-required={required}
		class="cs-input {error ? 'cs-input--error' : ''}"
		{...rest}
	/>
	{#if error}<span class="cs-field-error">⚠ {error}</span>{/if}
</div>
