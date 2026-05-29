import { env } from '$env/dynamic/private';

export interface MailMessage {
	to: string;
	subject: string;
	html: string;
}

export type MailDriver = (msg: MailMessage) => Promise<void>;

const consoleDriver: MailDriver = async ({ to, subject, html }) => {
	console.log('\n========== MAIL (dev) ==========');
	console.log('To:', to);
	console.log('Subject:', subject);
	console.log(html);
	console.log('================================\n');
};

let driver: MailDriver = consoleDriver;

export function setMailDriver(d: MailDriver) {
	driver = d;
}

export async function sendMail(msg: MailMessage): Promise<void> {
	await driver(msg);
}

export function appUrl(): string {
	return env.BETTER_AUTH_URL ?? env.APP_URL ?? 'http://localhost:3000';
}
