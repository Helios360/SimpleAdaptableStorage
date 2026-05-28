import nodemailer from 'nodemailer';
import { env } from '$env/dynamic/private';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!env.SMTP_HOST || !env.SMTP_USER) {
    console.warn('[mailer] SMTP not configured — emails will be logged to console only.');
    return null;
  }
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT || 587),
    secure: env.SMTP_SECURE === 'true',
    auth: env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined
  });
  return transporter;
}

export async function sendMail(to: string, subject: string, html: string) {
  const from = env.SMTP_FROM || env.SMTP_USER || 'no-reply@example.com';
  const tx = getTransporter();
  if (!tx) {
    console.log(`[mailer:dev] To: ${to}\nSubject: ${subject}\n${html}\n`);
    return;
  }
  await tx.sendMail({ from, to, subject, html });
}
