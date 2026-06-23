<script lang="ts">
	import Logo from '$lib/components/Logo.svelte';

	// Rôles masqués temporairement sur la landing (réversible : retirer l'id pour réafficher la carte)
	const HIDDEN_ROLES = ['recruteur'];

	const allRoles = [
		{
			id: 'candidat',
			icon: '🎓',
			label: 'Espace Candidat',
			desc: 'CVs, tests IA, candidatures',
			color: 'var(--c-blue)'
		},
		{
			id: 'cre',
			icon: '🏫',
			label: 'École',
			desc: 'CVthèque, validation, reporting',
			color: 'var(--c-purple)'
		},
		{
			id: 'recruteur',
			icon: '🏢',
			label: 'Recruteur',
			desc: 'Extranet, filtres, sélection',
			color: 'var(--c-accent)'
		}
	];

	const roles = allRoles.filter((r) => !HIDDEN_ROLES.includes(r.id));
</script>

<div class="cs-landing">
	<div class="cs-landing__glow"></div>
	<div class="cs-landing__inner">
		<div class="cs-landing__badge">PLATEFORME EMPLOI &amp; CERTIFICATION</div>

		<div class="cs-landing__brand">
			<Logo size={64} variant="light" />
		</div>
		<p class="cs-landing__sub">× Isograd — Testing Services</p>
		<p class="cs-landing__tag">
			La plateforme complète pour connecter étudiants, écoles et entreprises — du suivi des
			candidatures à la certification des compétences.
		</p>

		<div class="cs-landing__roles">
			{#each roles as r}
				<a
					class="cs-landing__role"
					href="/login/{r.id}"
					style:--role-color={r.color}
				>
					<span class="cs-landing__role-icon">{r.icon}</span>
					<p class="cs-landing__role-name">{r.label}</p>
					<p class="cs-landing__role-desc">{r.desc}</p>
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
		position: relative;
		min-height: 100vh;
		background: linear-gradient(135deg, var(--c-navy) 0%, var(--c-navy-mid) 60%, #1a3566 100%);
		display: grid;
		place-items: center;
		padding: 40px 24px;
		overflow: hidden;
	}
	.cs-landing__glow {
		position: absolute;
		inset: 0;
		pointer-events: none;
		background:
			radial-gradient(circle at 20% 50%, rgba(26, 86, 219, 0.22) 0%, transparent 50%),
			radial-gradient(circle at 80% 20%, rgba(6, 182, 212, 0.14) 0%, transparent 40%);
	}
	.cs-landing__inner {
		position: relative;
		z-index: 1;
		width: 100%;
		max-width: 720px;
		text-align: center;
	}
	.cs-landing__badge {
		display: inline-block;
		background: rgba(255, 255, 255, 0.07);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 20px;
		padding: 6px 18px;
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 2px;
		color: rgba(255, 255, 255, 0.55);
		margin-bottom: 26px;
	}
	.cs-landing__brand {
		display: flex;
		justify-content: center;
		margin-bottom: 8px;
	}
	.cs-landing__sub {
		font-family: var(--font-display);
		font-size: 16px;
		color: rgba(255, 255, 255, 0.4);
		margin-bottom: 18px;
	}
	.cs-landing__tag {
		color: rgba(255, 255, 255, 0.6);
		font-size: 16px;
		line-height: 1.7;
		max-width: 520px;
		margin: 0 auto 44px;
	}
	.cs-landing__roles {
		display: flex;
		gap: 16px;
		justify-content: center;
		flex-wrap: wrap;
		margin-bottom: 48px;
	}
	.cs-landing__role {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		flex: 1;
		min-width: 180px;
		max-width: 210px;
		background: rgba(255, 255, 255, 0.06);
		border: 1.5px solid color-mix(in srgb, var(--role-color) 35%, transparent);
		border-radius: 18px;
		padding: 24px 20px;
		text-align: center;
		transition:
			transform 0.2s,
			background 0.2s,
			border-color 0.2s;
	}
	.cs-landing__role:hover {
		transform: translateY(-3px);
		background: color-mix(in srgb, var(--role-color) 20%, transparent);
		border-color: var(--role-color);
	}
	.cs-landing__role-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 52px;
		height: 52px;
		border-radius: 14px;
		background: color-mix(in srgb, var(--role-color) 28%, transparent);
		font-size: 26px;
		margin-bottom: 4px;
	}
	.cs-landing__role-name {
		font-family: var(--font-display);
		font-weight: 700;
		font-size: 15px;
		color: #fff;
	}
	.cs-landing__role-desc {
		font-size: 12px;
		color: rgba(255, 255, 255, 0.45);
	}
	.cs-landing__signup {
		display: inline-block;
		color: rgba(255, 255, 255, 0.6);
		font-size: 14px;
		text-decoration: none;
	}
	.cs-landing__signup strong {
		color: var(--c-accent);
		font-weight: 700;
	}
	@media (max-width: 640px) {
		.cs-landing {
			padding: 28px 16px;
		}
		.cs-landing__tag {
			font-size: 14px;
			margin-bottom: 32px;
		}
		.cs-landing__roles {
			flex-direction: column;
			align-items: stretch;
		}
		.cs-landing__role {
			max-width: none;
			flex-direction: row;
			text-align: left;
			align-items: center;
			gap: 16px;
		}
		.cs-landing__role-icon {
			margin-bottom: 0;
			flex-shrink: 0;
		}
		.cs-landing__role-name,
		.cs-landing__role-desc {
			text-align: left;
		}
	}
</style>
