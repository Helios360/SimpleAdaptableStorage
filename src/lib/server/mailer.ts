import crypto from 'node:crypto';
import { env } from '$env/dynamic/private';

export interface MailMessage {
	to: string;
	subject: string;
	html: string;
}

export type MailDriver = (msg: MailMessage) => Promise<void>;

// Driver de dev : n'envoie rien, log dans la console (utile en local).
const consoleDriver: MailDriver = async ({ to, subject, html }) => {
	console.log('\n========== MAIL (dev) ==========');
	console.log('To:', to);
	console.log('Subject:', subject);
	console.log(html);
	console.log('================================\n');
};

// ─── Driver Gmail API (compte de service + délégation domaine) ───────────────

function b64url(input: Buffer | string): string {
	return Buffer.from(input)
		.toString('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

let tokenCache: { token: string; exp: number } | null = null;

/** Échange un JWT signé contre un access_token Gmail (scope gmail.send),
 *  en usurpant `sender` via la délégation à l'échelle du domaine. */
async function gmailAccessToken(saEmail: string, key: string, sender: string): Promise<string> {
	const now = Math.floor(Date.now() / 1000);
	if (tokenCache && tokenCache.exp - 60 > now) return tokenCache.token;

	const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
	const claims = b64url(
		JSON.stringify({
			iss: saEmail,
			sub: sender, // utilisateur Workspace usurpé (délégation domaine)
			scope: 'https://www.googleapis.com/auth/gmail.send',
			aud: 'https://oauth2.googleapis.com/token',
			iat: now,
			exp: now + 3600
		})
	);
	const signingInput = `${header}.${claims}`;
	const signature = crypto.sign('RSA-SHA256', Buffer.from(signingInput), key.replace(/\\n/g, '\n'));
	const jwt = `${signingInput}.${b64url(signature)}`;

	const res = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
			assertion: jwt
		})
	});
	if (!res.ok) throw new Error(`Gmail token error ${res.status}: ${await res.text()}`);
	const data = (await res.json()) as { access_token: string; expires_in: number };
	tokenCache = { token: data.access_token, exp: now + data.expires_in };
	return data.access_token;
}

/** Construit un message RFC 2822 (HTML, UTF-8) encodé en base64url pour l'API. */
function buildRaw(from: string, to: string, subject: string, html: string): string {
	const encSubject = `=?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`;
	const body = Buffer.from(html, 'utf8').toString('base64').replace(/(.{76})/g, '$1\r\n');
	const msg = [
		`From: ${from}`,
		`To: ${to}`,
		`Subject: ${encSubject}`,
		'MIME-Version: 1.0',
		'Content-Type: text/html; charset="UTF-8"',
		'Content-Transfer-Encoding: base64',
		'',
		body
	].join('\r\n');
	return b64url(msg);
}

function gmailDriver(saEmail: string, key: string, sender: string, fromName?: string): MailDriver {
	const from = fromName ? `=?UTF-8?B?${Buffer.from(fromName, 'utf8').toString('base64')}?= <${sender}>` : sender;
	return async ({ to, subject, html }) => {
		const token = await gmailAccessToken(saEmail, key, sender);
		const res = await fetch(
			`https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(sender)}/messages/send`,
			{
				method: 'POST',
				headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
				body: JSON.stringify({ raw: buildRaw(from, to, subject, html) })
			}
		);
		if (!res.ok) throw new Error(`Gmail send error ${res.status}: ${await res.text()}`);
	};
}

// ─── Sélection du driver ─────────────────────────────────────────────────────
// Gmail API si les 3 variables sont présentes, sinon console (dev).

let driver: MailDriver | null = null;

function resolveDriver(): MailDriver {
	if (driver) return driver;
	const saEmail = env.GMAIL_SA_EMAIL;
	const key = env.GMAIL_SA_KEY ?? env.SERVICE_CLIENT_SECRET;
	const sender = env.GMAIL_SENDER;
	if (saEmail && key && sender) {
		driver = gmailDriver(saEmail, key, sender, env.GMAIL_FROM_NAME ?? 'CloudStudent');
	} else {
		driver = consoleDriver;
	}
	return driver;
}

export function setMailDriver(d: MailDriver) {
	driver = d;
}

export async function sendMail(msg: MailMessage): Promise<void> {
	await resolveDriver()(msg);
}

export function appUrl(): string {
	return env.BETTER_AUTH_URL ?? env.APP_URL ?? 'http://localhost:3000';
}
