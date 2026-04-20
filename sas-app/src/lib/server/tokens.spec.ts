import { describe, expect, it } from 'vitest';
import { hashToken, makeToken } from './tokens';

describe('tokens', () => {
	it('hashToken is deterministic', () => {
		expect(hashToken('abc')).toBe(hashToken('abc'));
		expect(hashToken('abc')).not.toBe(hashToken('abcd'));
	});

	it('makeToken returns a token + hash', () => {
		const { token, tokenHash } = makeToken();
		expect(token).toBeTypeOf('string');
		expect(tokenHash).toBeTypeOf('string');
		expect(tokenHash).toBe(hashToken(token));
	});
});
