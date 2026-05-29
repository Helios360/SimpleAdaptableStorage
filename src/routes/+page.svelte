<script lang="ts">
	import Logo from '$lib/components/Logo.svelte';

	const roles = [
		{
			id: 'candidat',
			icon: '🎓',
			label: 'Candidat',
			desc: 'CVs, tests IA et candidatures',
			color: 'var(--c-blue)',
			bg: 'var(--c-blue-soft)',
			demo: 'lea@student.fr'
		},
		{
			id: 'cre',
			icon: '🏫',
			label: 'CRE / École',
			desc: 'Validez les dossiers, gérez la CVthèque',
			color: 'var(--c-purple)',
			bg: 'var(--c-purple-light)',
			demo: 'elodie@cloudstudent.fr'
		},
		{
			id: 'recruteur',
			icon: '🏢',
			label: 'Recruteur',
			desc: 'Parcourez les profils qualifiés',
			color: 'var(--c-accent)',
			bg: 'var(--c-accent-light)',
			demo: 'marie@orange.fr'
		}
	];
</script>

<div class="cs-landing">
	<div class="cs-landing__inner">
		<div class="cs-landing__brand">
			<Logo size={64} variant="light" />
		</div>
		<p class="cs-landing__tag">Plateforme de qualification & placement en alternance</p>
		<div class="cs-landing__roles">
			{#each roles as r}
				<a class="cs-landing__role" href="/login/{r.id}" style:background={r.bg}>
					<span class="cs-landing__role-icon">{r.icon}</span>
					<div class="cs-landing__role-body">
						<p class="cs-landing__role-name" style:color={r.color}>{r.label}</p>
						<p class="cs-landing__role-desc">{r.desc}</p>
						<p class="cs-landing__role-demo" style:color={r.color}>👤 {r.demo} · mdp : demo</p>
					</div>
					<span class="cs-landing__role-arrow" style:color={r.color}>→</span>
				</a>
			{/each}
		</div>
		<a class="cs-landing__signup" href="/register">
			Pas encore inscrit ? <strong>Créer un compte étudiant →</strong>
		</a>
	</div>
</div>

<style>
	.cs-landing {
		min-height: 100vh;
		background: var(--c-navy);
		display: grid;
		place-items: center;
		padding: 24px;
	}
	.cs-landing__inner {
		width: 100%;
		max-width: 600px;
		text-align: center;
	}
	.cs-landing__brand {
		display: flex;
		justify-content: center;
		margin-bottom: 12px;
	}
	.cs-landing__tag {
		color: rgba(255, 255, 255, 0.5);
		font-size: 15px;
		margin-bottom: 40px;
	}
	.cs-landing__roles {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.cs-landing__role {
		border-radius: 16px;
		padding: 20px 26px;
		text-align: left;
		display: flex;
		align-items: center;
		gap: 18px;
		transition: transform 0.15s;
	}
	.cs-landing__role:hover {
		transform: scale(1.02);
	}
	.cs-landing__role-icon {
		font-size: 30px;
	}
	.cs-landing__role-body {
		flex: 1;
	}
	.cs-landing__role-name {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 17px;
	}
	.cs-landing__role-desc {
		font-size: 13px;
		color: var(--c-muted);
		margin-top: 3px;
	}
	.cs-landing__role-demo {
		font-size: 11px;
		margin-top: 4px;
		font-weight: 600;
	}
	.cs-landing__role-arrow {
		font-size: 20px;
	}
	.cs-landing__signup {
		display: inline-block;
		margin-top: 28px;
		color: rgba(255, 255, 255, 0.6);
		font-size: 14px;
		text-decoration: none;
	}
	.cs-landing__signup strong {
		color: var(--c-accent);
		font-weight: 700;
	}
	@media (max-width: 540px) {
		.cs-landing {
			padding: 16px;
		}
		.cs-landing__tag {
			font-size: 13px;
			margin-bottom: 28px;
		}
		.cs-landing__role {
			padding: 16px;
			gap: 12px;
		}
		.cs-landing__role-icon {
			font-size: 26px;
		}
		.cs-landing__role-name {
			font-size: 15px;
		}
		.cs-landing__role-desc {
			font-size: 12px;
		}
		.cs-landing__role-demo {
			font-size: 10.5px;
			overflow-wrap: anywhere;
		}
	}
</style>
