import crypto from 'node:crypto';

// Small helpers for short-lived links (email verification, password reset).

export function makeToken(byteLength = 32) {
	const token = crypto.randomBytes(byteLength).toString('hex');
	return { token, tokenHash: hashToken(token) };
}

export function hashToken(token: string) {
	return crypto.createHash('sha256').update(token).digest('hex');
}
