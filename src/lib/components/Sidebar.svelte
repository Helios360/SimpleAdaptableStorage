<script lang="ts">
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import type { User } from '$lib/server/auth';

	export interface NavItem {
		href: string;
		icon: string;
		label: string;
		badge?: number;
	}

	interface Props {
		items: NavItem[];
		user: Pick<User, 'name' | 'role' | 'avatar'>;
		open: boolean;
		onclose: () => void;
		isMobile: boolean;
	}

	let { items, user, open, onclose, isMobile }: Props = $props();

	const roleColors = { candidat: 'var(--c-blue)', cre: 'var(--c-purple)', recruteur: 'var(--c-accent)' };
	const roleBg = { candidat: 'var(--c-blue-light)', cre: 'var(--c-purple-light)', recruteur: 'var(--c-accent-light)' };
	const roleLabel = { candidat: 'Candidat', cre: 'CRE', recruteur: 'Recruteur' };

	const r = $derived((user.role as keyof typeof roleColors) ?? 'candidat');

	function isActive(href: string): boolean {
		const path = $page.url.pathname;
		let best = '';
		for (const it of items) {
			if (path === it.href || (it.href !== '/' && path.startsWith(it.href + '/'))) {
				if (it.href.length > best.length) best = it.href;
			}
		}
		return best === href;
	}
</script>

{#if isMobile && open}
	<button class="cs-side__overlay" aria-label="Fermer le menu" onclick={onclose}></button>
{/if}

<nav
	class="cs-side"
	class:cs-side--mobile={isMobile}
	class:cs-side--open={open}
	aria-label="Navigation"
>
	<div class="cs-side__user">
		<div class="cs-side__avatar" style:background={roleColors[r]}>
			{user.avatar ?? '?'}
		</div>
		<div class="cs-side__user-info">
			<div class="cs-side__user-name">{user.name}</div>
			<div class="cs-side__role" style:background={roleBg[r]} style:color={roleColors[r]}>
				{roleLabel[r]}
			</div>
		</div>
	</div>

	<ul class="cs-side__list">
		{#each items as item}
			{@const active = isActive(item.href)}
			<li>
				<a
					href={item.href}
					class="cs-side__link"
					class:cs-side__link--active={active}
					aria-current={active ? 'page' : undefined}
					onclick={() => isMobile && onclose()}
				>
					<span class="cs-side__link-icon">{item.icon}</span>
					{item.label}
					{#if item.badge}
						<span class="cs-side__badge">{item.badge}</span>
					{/if}
				</a>
			</li>
		{/each}
	</ul>

	<form method="POST" action="/logout" use:enhance class="cs-side__logout-form">
		<button type="submit" class="cs-side__logout">⤴ Déconnexion</button>
	</form>
</nav>

<style>
	.cs-side__overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.45);
		z-index: 899;
		border: none;
		cursor: pointer;
	}
	.cs-side {
		position: relative;
		min-width: 190px;
		background: var(--c-navy);
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
		z-index: auto;
	}
	.cs-side--mobile {
		position: fixed;
		inset: 0 auto 0 0;
		z-index: 900;
		transform: translateX(-100%);
		transition: transform 0.25s ease;
	}
	.cs-side--mobile.cs-side--open {
		transform: translateX(0);
	}
	.cs-side__user {
		padding: 14px 20px;
		display: flex;
		align-items: center;
		gap: 10px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}
	.cs-side__avatar {
		width: 34px;
		height: 34px;
		border-radius: 10px;
		display: grid;
		place-items: center;
		font-size: 12px;
		font-weight: 700;
		color: #fff;
		flex-shrink: 0;
	}
	.cs-side__user-info {
		overflow: hidden;
	}
	.cs-side__user-name {
		font-size: 13px;
		font-weight: 600;
		color: #fff;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.cs-side__role {
		font-size: 11px;
		padding: 1px 6px;
		border-radius: 99px;
		font-weight: 700;
		display: inline-block;
		margin-top: 2px;
	}
	.cs-side__list {
		flex: 1;
		padding: 12px 10px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.cs-side__link {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 9px 12px;
		border-radius: 9px;
		background: transparent;
		border: 1px solid transparent;
		color: rgba(255, 255, 255, 0.5);
		font-size: 13px;
		text-align: left;
		transition: all 0.12s;
	}
	.cs-side__link:hover {
		color: rgba(255, 255, 255, 0.85);
	}
	.cs-side__link--active {
		background: rgba(26, 86, 219, 0.25);
		border-color: rgba(26, 86, 219, 0.4);
		color: #fff;
		font-weight: 600;
	}
	.cs-side__link-icon {
		font-size: 15px;
	}
	.cs-side__badge {
		margin-left: auto;
		background: var(--c-orange);
		color: #fff;
		font-size: 10px;
		font-weight: 700;
		padding: 1px 6px;
		border-radius: 99px;
	}
	.cs-side__logout-form {
		padding: 10px 10px 16px;
	}
	.cs-side__logout {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 9px 12px;
		border-radius: 9px;
		background: transparent;
		border: none;
		color: rgba(255, 255, 255, 0.35);
		font-size: 13px;
		cursor: pointer;
	}
	.cs-side__logout:hover {
		color: rgba(255, 255, 255, 0.7);
	}
</style>
