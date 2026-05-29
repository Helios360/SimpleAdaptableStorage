<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import CandidatDetail from '$lib/components/CandidatDetail.svelte';
	import Empty from '$lib/components/Empty.svelte';
	import { pushToast } from '$lib/stores/toast.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	async function deleteMyAccount() {
		const res = await fetch('?/deleteAccount', { method: 'POST', body: new FormData() });
		// SvelteKit form actions answer redirects with a JSON envelope describing
		// the destination; follow it client-side so the user lands on /.
		if (res.redirected) {
			window.location.href = res.url;
			return;
		}
		const ct = res.headers.get('content-type') ?? '';
		if (ct.includes('application/json')) {
			const data = (await res.json().catch(() => null)) as { type?: string; location?: string } | null;
			if (data?.type === 'redirect' && data.location) {
				await goto(data.location, { invalidateAll: true });
				return;
			}
		}
		if (!res.ok) {
			pushToast('Erreur lors de la suppression du compte', 'error');
		}
	}
</script>

{#if data.profile}
	<CandidatDetail
		candidat={data.profile}
		open={true}
		onclose={() => {}}
		editable
		inline
		hideTags
		manageCvs={false}
		actionName="?/updateMyProfile"
		formations={data.formations}
		skillSuggestions={data.defaultSkills}
		onsaved={() => invalidateAll()}
		deleteLabel="Supprimer mon compte"
		deleteConfirmTitle="Supprimer votre compte ?"
		deleteConfirmMessage="Vous serez déconnecté immédiatement. Le compte, le profil, les CVs et toutes les pièces déposées seront effacés définitivement."
		ondelete={deleteMyAccount}
	/>
{:else}
	<Empty title="Profil introuvable" sub="Aucun dossier candidat n'est associé à ce compte." />
{/if}
