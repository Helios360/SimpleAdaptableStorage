<script lang="ts">
	import Modal from './Modal.svelte';
	import Button from './Button.svelte';

	interface Props {
		open: boolean;
		onclose: () => void;
		onconfirm: () => void;
		title: string;
		message: string;
		danger?: boolean;
	}

	let { open, onclose, onconfirm, title, message, danger = false }: Props = $props();
</script>

<Modal {open} {onclose} {title} width={380}>
	<p class="cs-confirm__msg">{message}</p>
	<div class="cs-confirm__actions">
		<Button variant="subtle" onclick={onclose}>Annuler</Button>
		<Button
			variant={danger ? 'danger' : 'primary'}
			onclick={() => {
				onconfirm();
				onclose();
			}}
		>
			Confirmer
		</Button>
	</div>
</Modal>

<style>
	.cs-confirm__msg {
		font-size: 14px;
		color: var(--c-sub);
		line-height: 1.6;
		margin-bottom: 24px;
	}
	.cs-confirm__actions {
		display: flex;
		gap: 10px;
		justify-content: flex-end;
	}
</style>
