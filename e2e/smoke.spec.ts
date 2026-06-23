import { test, expect } from '@playwright/test';

test('homepage responds and renders without server error', async ({ page }) => {
	const response = await page.goto('/');
	expect(response, 'response should be defined').not.toBeNull();
	expect(response!.status(), 'status should be < 500').toBeLessThan(500);
	await expect(page.locator('body')).toBeVisible();
});

test('healthz returns 200 when the DB is reachable', async ({ request }) => {
	const res = await request.get('/api/healthz');
	expect(res.status()).toBe(200);
	const body = await res.json();
	expect(body.status).toBe('ok');
});

test('login page renders for a known role', async ({ page }) => {
	const response = await page.goto('/login/candidat');
	expect(response!.status()).toBeLessThan(500);
	await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
});
