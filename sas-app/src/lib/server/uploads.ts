import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { env } from '$env/dynamic/private';
import { PDFDocument } from 'pdf-lib';

export const UPLOAD_KINDS = ['cv', 'id_doc', 'id_doc_verso'] as const;
export type UploadKind = (typeof UPLOAD_KINDS)[number];

const ALLOWED_MIME = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const ALLOWED_EXT = new Set(['.pdf', '.jpg', '.jpeg', '.png']);

export function getUploadsRoot() {
	// Keep uploads out of /static (documents are private).
	return path.resolve(env.APP_UPLOADS_DIR || path.join(process.cwd(), 'uploads'));
}

export function userDir(userId: number) {
	return path.join(getUploadsRoot(), `u_${userId}`);
}

export function toAbsFromStored(storedPath: string) {
	const root = getUploadsRoot();
	const rel = storedPath.replace(/^[\\/]+/, '');
	const abs = path.normalize(path.join(root, rel));

	if (!abs.startsWith(root + path.sep)) {
		throw new Error('Invalid stored path (escapes uploads root)');
	}

	return abs;
}

export function guessContentType(filePath: string) {
	const ext = path.extname(filePath).toLowerCase();
	if (ext === '.pdf') return 'application/pdf';
	if (ext === '.png') return 'image/png';
	if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
	return 'application/octet-stream';
}

function getExt(file: File) {
	const ext = path.extname(file.name || '').toLowerCase();
	return ext;
}

function assertAllowedFile(file: File) {
	const ext = getExt(file);
	if (!ALLOWED_EXT.has(ext)) throw new Error('Unsupported file extension');
	if (!ALLOWED_MIME.has(file.type)) throw new Error('Unsupported file type');
	if (file.size <= 0) throw new Error('Empty file');
	if (file.size > 10 * 1024 * 1024) throw new Error('File too large (max 10MB)');
}

async function maybeWatermarkPdf(absPdfPath: string) {
	// Lightly kept from the old app: watermark CV PDFs if we can.
	const watermarkPath = env.WATERMARK_PATH
		? path.resolve(env.WATERMARK_PATH)
		: path.resolve(process.cwd(), 'static/sources/LogoBleuOmbre-edited.png');

	try {
		const [pdfBytes, watermarkBytes] = await Promise.all([
			fs.readFile(absPdfPath),
			fs.readFile(watermarkPath)
		]);
		const pdfDoc = await PDFDocument.load(pdfBytes);
		const watermarkImage = await pdfDoc.embedPng(watermarkBytes);
		const dims = watermarkImage.scale(0.1);

		const page = pdfDoc.getPages()[0];
		if (!page) return;
		const { width } = page.getSize();

		page.drawImage(watermarkImage, {
			x: width - dims.width - 5,
			y: dims.height - 70,
			width: dims.width,
			height: dims.height,
			opacity: 0.7
		});

		const out = await pdfDoc.save();
		await fs.writeFile(absPdfPath, out);
	} catch (e) {
		// Watermarking is best-effort. Upload should still succeed.
		console.warn('[uploads] Watermark skipped:', (e as Error).message);
	}
}

export async function saveUserUpload(params: {
	userId: number;
	kind: UploadKind;
	file: File;
}) {
	const { userId, kind, file } = params;
	assertAllowedFile(file);

	const ext = getExt(file);
	const dir = userDir(userId);
	await fs.mkdir(dir, { recursive: true });

	const safeName = `u_${userId}_${kind}_${Date.now()}_${crypto.randomUUID()}${ext}`;
	const abs = path.join(dir, safeName);
	const stored = `u_${userId}/${safeName}`;

	const buf = Buffer.from(await file.arrayBuffer());
	await fs.writeFile(abs, buf);

	if (kind === 'cv' && ext === '.pdf') {
		await maybeWatermarkPdf(abs);
	}

	return { storedPath: stored, absPath: abs };
}

export async function deleteStoredFile(storedPath: string | null | undefined) {
	if (!storedPath) return;
	const abs = toAbsFromStored(storedPath);
	try {
		await fs.unlink(abs);
	} catch (e: any) {
		if (e?.code !== 'ENOENT') throw e;
	}
}

export async function deleteUserFolder(userId: number) {
	try {
		await fs.rm(userDir(userId), { recursive: true, force: true });
	} catch (e: any) {
		if (e?.code !== 'ENOENT') throw e;
	}
}
