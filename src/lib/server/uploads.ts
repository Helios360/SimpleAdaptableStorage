import { mkdir, rm, rename, unlink, writeFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { env } from '$env/dynamic/private';

export const UPLOADS_ROOT = path.resolve(env.UPLOADS_DIR || './uploads');
export const MAX_UPLOAD_BYTES = Number(env.MAX_UPLOAD_BYTES || 10 * 1024 * 1024);

export const ALLOWED_MIME = new Set(['application/pdf', 'image/jpeg', 'image/png']);
export const ALLOWED_EXT = new Set(['.pdf', '.jpg', '.jpeg', '.png']);
export const FILE_KINDS = ['cv', 'id_doc', 'id_doc_verso'] as const;
export type FileKind = (typeof FILE_KINDS)[number];

export const userDir = (uid: string) => path.join(UPLOADS_ROOT, `u_${uid}`);

export function relFromAbs(abs: string) {
  return path.relative(UPLOADS_ROOT, abs).replaceAll('\\', '/');
}

export function toAbsFromStored(stored: string) {
  const rel = stored.replace(/^[/\\]+/, '');
  const abs = path.normalize(path.join(UPLOADS_ROOT, rel));
  if (!abs.startsWith(UPLOADS_ROOT + path.sep) && abs !== UPLOADS_ROOT) {
    throw new Error('Path escapes uploads root');
  }
  return abs;
}

export function guessContentType(p: string) {
  const ext = path.extname(p).toLowerCase();
  if (ext === '.pdf') return 'application/pdf';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  return 'application/octet-stream';
}

export function validate(file: File) {
  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) return { ok: false as const, reason: 'extension' };
  if (!ALLOWED_MIME.has(file.type)) return { ok: false as const, reason: 'mime' };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false as const, reason: 'size' };
  return { ok: true as const, ext };
}

/** Persist a File into the user's directory; returns the stored relative path. */
export async function persistFile(uid: string, kind: FileKind, file: File) {
  const v = validate(file);
  if (!v.ok) throw Object.assign(new Error('invalid_file'), { status: 415, reason: v.reason });

  const dir = userDir(uid);
  await mkdir(dir, { recursive: true });
  const safeName = `u_${uid}_${kind}_${crypto.randomUUID()}${v.ext}`;
  const abs = path.join(dir, safeName);
  await writeFile(abs, Buffer.from(await file.arrayBuffer()));
  return { abs, rel: relFromAbs(abs) };
}

export async function removeStored(stored: string | null | undefined) {
  if (!stored) return;
  try {
    await unlink(toAbsFromStored(stored));
  } catch (e: any) {
    if (e?.code !== 'ENOENT') console.warn('[uploads] unlink failed:', e?.message);
  }
}

export async function removeUserDir(uid: string) {
  try {
    await rm(userDir(uid), { recursive: true, force: true });
  } catch (e: any) {
    if (e?.code !== 'ENOENT') console.warn('[uploads] rmdir failed:', e?.message);
  }
}

export async function fileStream(stored: string) {
  const abs = toAbsFromStored(stored);
  await stat(abs);
  return { abs, stream: createReadStream(abs) };
}

export { mkdir, rename };
