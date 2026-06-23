import { mkdir, writeFile, unlink, readFile, rm } from 'node:fs/promises';
import { join, normalize, sep } from 'node:path';

export const UPLOAD_ROOT = process.env.UPLOADS_DIR
	? join(process.env.UPLOADS_DIR)
	: join(process.cwd(), 'uploads');

export function extOf(name: string): string {
	const i = name.lastIndexOf('.');
	return i < 0 ? '' : name.slice(i + 1).toLowerCase();
}

const MIMES: Record<string, string> = {
	pdf: 'application/pdf',
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	webp: 'image/webp',
	mp4: 'video/mp4',
	webm: 'video/webm',
	mov: 'video/quicktime',
	m4v: 'video/x-m4v'
};

export function mimeFor(filename: string): string {
	return MIMES[extOf(filename)] ?? 'application/octet-stream';
}

export interface FileSlot {
	allowed: string[];
	maxMB: number;
	label: string;
}

export type InscriptionSlot = 'cv' | 'id_recto' | 'id_verso';

export const INSCRIPTION_SLOTS: Record<InscriptionSlot, FileSlot> = {
	cv: { allowed: ['pdf'], maxMB: 5, label: "CV d'inscription" },
	id_recto: { allowed: ['pdf', 'png', 'jpg', 'jpeg', 'webp'], maxMB: 5, label: "Pièce d'identité (recto)" },
	id_verso: { allowed: ['pdf', 'png', 'jpg', 'jpeg', 'webp'], maxMB: 5, label: "Pièce d'identité (verso)" }
};

export const INSCRIPTION_COLUMNS: Record<InscriptionSlot, 'cvPath' | 'idDocPath' | 'idDocVersoPath'> = {
	cv: 'cvPath',
	id_recto: 'idDocPath',
	id_verso: 'idDocVersoPath'
};

export function validateUpload(file: File | null, slot: FileSlot): string | null {
	if (!file || !(file instanceof File) || file.size === 0) return `${slot.label} manquant.`;
	const ext = extOf(file.name);
	if (!slot.allowed.includes(ext)) {
		return `${slot.label} : format invalide (${slot.allowed.join(', ')}).`;
	}
	if (file.size > slot.maxMB * 1024 * 1024) {
		return `${slot.label} : fichier trop volumineux (max ${slot.maxMB} Mo).`;
	}
	return null;
}

/**
 * Save a File somewhere under UPLOAD_ROOT. `relDir` is appended to the root,
 * the resulting filename is `<basename>.<ext>`. Returns the relative path
 * (so we can store it in the DB and round-trip it through `resolveSafe`).
 */
export async function saveUpload(
	relDir: string,
	basename: string,
	file: File
): Promise<string> {
	const ext = extOf(file.name);
	const safe = `${basename}.${ext}`;
	const absDir = join(UPLOAD_ROOT, relDir);
	await mkdir(absDir, { recursive: true });
	const abs = join(absDir, safe);
	const buf = Buffer.from(await file.arrayBuffer());
	await writeFile(abs, buf);
	return `${relDir.replace(/\\/g, '/')}/${safe}`;
}

/**
 * Resolve a stored relative path against UPLOAD_ROOT, refusing anything that
 * escapes the root (defence in depth — paths come from the DB but never trust).
 */
export function resolveSafe(rel: string): string | null {
	const norm = normalize(rel);
	if (norm.startsWith('..') || norm.includes(`${sep}..${sep}`)) return null;
	const abs = join(UPLOAD_ROOT, norm);
	if (!abs.startsWith(UPLOAD_ROOT + sep) && abs !== UPLOAD_ROOT) return null;
	return abs;
}

export async function deleteUpload(rel: string): Promise<void> {
	const abs = resolveSafe(rel);
	if (!abs) return;
	try {
		await unlink(abs);
	} catch {
		// Already gone — fine.
	}
}

/**
 * Recursively delete a directory inside UPLOAD_ROOT. Used when nuking all
 * files for a candidat/user at once. Refuses to operate outside the root
 * (resolveSafe) and tolerates a missing directory.
 */
export async function deleteUploadDir(rel: string): Promise<void> {
	const abs = resolveSafe(rel);
	if (!abs || abs === UPLOAD_ROOT) return;
	await rm(abs, { recursive: true, force: true });
}

function asciiFallback(name: string): string {
	return name.normalize('NFKD').replace(/[^\x20-\x7e]/g, '_').replace(/"/g, "'");
}

export async function streamFile(rel: string, filename: string, inline: boolean): Promise<Response> {
	const abs = resolveSafe(rel);
	if (!abs) return new Response('Not found', { status: 404 });
	let buf: Buffer;
	try {
		buf = await readFile(abs);
	} catch {
		return new Response('Not found', { status: 404 });
	}
	// MIME comes from the on-disk path (the source of truth); `filename` is the
	// label shown to the user and may have no extension — never use it for MIME.
	const pathExt = extOf(rel);
	const mime = MIMES[pathExt] ?? 'application/octet-stream';
	// Ensure the download filename carries the correct extension, otherwise
	// "Save as…" loses the type and double-click after download breaks.
	const dlName = extOf(filename) === pathExt ? filename : `${filename}.${pathExt}`;
	// Copy into a fresh ArrayBuffer — Bun's TypedArray types require ArrayBuffer
	// (not the union ArrayBufferLike) for Blob/Response bodies.
	const ab = new ArrayBuffer(buf.byteLength);
	new Uint8Array(ab).set(buf);
	const body = new Blob([ab], { type: mime });
	const dispo = inline ? 'inline' : 'attachment';
	const ascii = asciiFallback(dlName);
	const encoded = encodeURIComponent(dlName);
	return new Response(body, {
		headers: {
			'Content-Type': mime,
			'Content-Length': String(body.size),
			'Content-Disposition': `${dispo}; filename="${ascii}"; filename*=UTF-8''${encoded}`,
			'X-Content-Type-Options': 'nosniff',
			'Cache-Control': 'private, max-age=0, must-revalidate'
		}
	});
}
