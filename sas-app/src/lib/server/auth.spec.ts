import { describe, expect, it } from 'vitest';

// $env/dynamic/private reads from process.env.
process.env.JWT_SECRET = 'test-secret';

import { signUserToken, verifyUserToken } from './auth';

describe('auth tokens', () => {
	it('sign/verify roundtrip', () => {
		const token = signUserToken({
			id: 1,
			email: 'a@b.c',
			name: 'Doe',
			fname: 'John',
			formation_id: 3,
			is_admin: false,
			staff_formations: null
		});

		const decoded = verifyUserToken(token);
		expect(decoded?.email).toBe('a@b.c');
		expect(decoded?.id).toBe(1);
	});
});
