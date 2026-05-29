import { fail } from '@sveltejs/kit';
import { and, eq, type SQL } from 'drizzle-orm';
import { db } from './db';
import { candidat } from './db/schema';
import {
	deleteUpload,
	saveUpload,
	validateUpload,
	INSCRIPTION_SLOTS,
	INSCRIPTION_COLUMNS,
	type InscriptionSlot
} from './uploads';

function parseSlot(raw: unknown): InscriptionSlot | null {
	const s = String(raw ?? '');
	return s === 'cv' || s === 'id_recto' || s === 'id_verso' ? s : null;
}

interface OwnedCandidat {
	id: number;
	userId: string;
	cvPath: string | null;
	idDocPath: string | null;
	idDocVersoPath: string | null;
}

async function loadOwnedCandidat(
	candidatId: number,
	ownerUserId: string | null
): Promise<OwnedCandidat | null> {
	const conds: SQL[] = [eq(candidat.id, candidatId)];
	if (ownerUserId) conds.push(eq(candidat.userId, ownerUserId));
	const rows = await db
		.select({
			id: candidat.id,
			userId: candidat.userId,
			cvPath: candidat.cvPath,
			idDocPath: candidat.idDocPath,
			idDocVersoPath: candidat.idDocVersoPath
		})
		.from(candidat)
		.where(and(...conds))
		.limit(1);
	return rows[0] ?? null;
}

/**
 * Replace an inscription-doc slot (cv / id_recto / id_verso). When
 * `ownerUserId` is non-null, only the matching candidat owner can update —
 * use that path for student self-service. Pass null for admin.
 */
export async function updateInscriptionDocFor(form: FormData, ownerUserId: string | null) {
	const candidatId = Number(form.get('candidatId'));
	const slot = parseSlot(form.get('slot'));
	const file = form.get('file') as File | null;
	if (!Number.isFinite(candidatId) || !slot) return fail(400, { error: 'Paramètres invalides' });

	const slotCfg = INSCRIPTION_SLOTS[slot];
	const validation = validateUpload(file, slotCfg);
	if (validation) return fail(400, { error: validation });

	const row = await loadOwnedCandidat(candidatId, ownerUserId);
	if (!row) return fail(404, { error: 'Candidat introuvable' });

	const col = INSCRIPTION_COLUMNS[slot];
	const oldPath = row[col];

	const f = file as File;
	const path = await saveUpload(`candidat/${row.userId}/inscription`, `${slot}_${Date.now()}`, f);

	await db
		.update(candidat)
		.set({ [col]: path, updatedAt: new Date() })
		.where(eq(candidat.id, row.id));

	if (oldPath && oldPath !== path) await deleteUpload(oldPath);
	return { success: true, slot, path };
}

export async function removeInscriptionDocFor(form: FormData, ownerUserId: string | null) {
	const candidatId = Number(form.get('candidatId'));
	const slot = parseSlot(form.get('slot'));
	if (!Number.isFinite(candidatId) || !slot) return fail(400, { error: 'Paramètres invalides' });

	const row = await loadOwnedCandidat(candidatId, ownerUserId);
	if (!row) return fail(404, { error: 'Candidat introuvable' });

	const col = INSCRIPTION_COLUMNS[slot];
	const oldPath = row[col];

	await db
		.update(candidat)
		.set({ [col]: null, updatedAt: new Date() })
		.where(eq(candidat.id, row.id));

	if (oldPath) await deleteUpload(oldPath);
	return { success: true, slot };
}
