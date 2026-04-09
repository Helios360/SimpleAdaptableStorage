import nodemailer from 'nodemailer';
import { env } from '$env/dynamic/private';

let warned = false;

function getFrom() {
	return env.MAIL_FROM || env.SMTP_FROM || 'no-reply@example.com';
}

function createTransport() {
	// Option A: plain SMTP user/pass
	if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
		return nodemailer.createTransport({
			host: env.SMTP_HOST,
			port: env.SMTP_PORT ? Number(env.SMTP_PORT) : 465,
			secure: env.SMTP_SECURE ? env.SMTP_SECURE === 'true' : true,
			auth: {
				user: env.SMTP_USER,
				pass: env.SMTP_PASS
			}
		});
	}

	// Option B: Gmail / service account OAuth2 (legacy from the old app)
	if (env.SERVICE_CLIENT && env.SERVICE_CLIENT_SECRET) {
		const privateKey = env.SERVICE_CLIENT_SECRET.replace(/\\n/g, '\n');
		return nodemailer.createTransport({
			host: env.SMTP_HOST || 'smtp.gmail.com',
			port: env.SMTP_PORT ? Number(env.SMTP_PORT) : 465,
			secure: true,
			auth: {
				type: 'OAuth2',
				user: env.SMTP_USER || getFrom(),
				serviceClient: env.SERVICE_CLIENT,
				privateKey,
				scope: 'https://mail.google.com/'
			}
		});
	}

	return null;
}

export async function sendMail(to: string, subject: string, html: string) {
	const transporter = createTransport();
	if (!transporter) {
		if (!warned) {
			warned = true;
			console.warn('[mailer] Mailer not configured; emails will be skipped');
		}
		return;
	}

	await transporter.sendMail({
		from: getFrom(),
		to,
		subject,
		html
	});
}
