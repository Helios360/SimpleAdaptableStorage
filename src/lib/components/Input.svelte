<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends Omit<HTMLInputAttributes, 'value'> {
		label?: string;
		value: string;
		error?: string;
	}

	let {
		label,
		value = $bindable(),
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
		<label for={name} class="cs-field__label">
			{label}{#if required}<span class="cs-field__req">*</span>{/if}
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
		class="cs-field__input {error ? 'cs-field__input--error' : ''}"
		{...rest}
	/>
	{#if error}<span class="cs-field__error">⚠ {error}</span>{/if}
</div>

<style>
	.cs-field {
		display: flex;
		flex-direction: column;
		gap: 5px;
		min-width: 0;
	}
	.cs-field__label {
		font-size: 13px;
		font-weight: 600;
		color: var(--c-sub);
	}
	.cs-field__req {
		color: var(--c-red);
		margin-left: 3px;
	}
	.cs-field__input {
		width: 100%;
		min-width: 0;
		padding: 10px 14px;
		border-radius: 9px;
		border: 1.5px solid var(--c-border);
		font-size: 14px;
		color: var(--c-text);
		outline: none;
		background: var(--c-card);
		transition: border-color 0.12s;
	}
	.cs-field__input:focus {
		border-color: var(--c-blue);
	}
	.cs-field__input--error,
	.cs-field__input--error:focus {
		border-color: var(--c-red);
	}
	.cs-field__error {
		font-size: 12px;
		color: var(--c-red);
	}
</style>
