import jwt from 'jsonwebtoken';
import { env } from '$env/dynamic/private';

export type SessionUser = {
	id: number;
	email: string;
	name: string;
	fname: string;
	formation_id: number | null;
	is_admin: boolean;
	staff_formations: number[] | null;
};

function getSecret() {
	if (!env.JWT_SECRET) throw new Error('JWT_SECRET is not set');
	return env.JWT_SECRET;
}

export function signUserToken(user: SessionUser) {
	return jwt.sign(user, getSecret(), { expiresIn: '2h' });
}

export function verifyUserToken(token: string): SessionUser | null {
	try {
		return jwt.verify(token, getSecret()) as SessionUser;
	} catch {
		return null;
	}
}
