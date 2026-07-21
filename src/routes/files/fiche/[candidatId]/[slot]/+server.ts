import { error, type RequestHandler } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { candidat, type FicheEtudiantData } from '$lib/server/db/schema';
import { streamFile } from '$lib/server/uploads';

// Slots = clés « *Path » de candidat.ficheInfos (JSONB), + libellé de téléchargement.
const SLOTS: Record<string, string> = {
	titreSejourPath: "Carte d'identité ou titre de séjour",
	carteVitalePath: 'Carte vitale',
	diplomePath: 'Diplôme',
	photoIdPath: "Photo d'identité",
	reglementInterieurPath: 'Règlement intérieur',
	attestationSportifPath: 'Attestation sportif',
	attestationRqthPath: 'Attestation RQTH',
	ancienCerfaPath: 'Ancien CERFA'
};

export const GET: RequestHandler = async ({ params, locals, url, request }) => {
	if (!locals.user) throw error(401, 'Non autorisé');
	const id = Number(params.candidatId);
	const slot = params.slot as keyof FicheEtudiantData;
	if (!Number.isFinite(id) || !(slot in SLOTS)) throw error(400, 'Document invalide');

	const rows = await db
		.select({ ownerId: candidat.userId, fiche: candidat.ficheInfos })
		.from(candidat)
		.where(eq(candidat.id, id))
		.limit(1);

	const row = rows[0];
	if (!row) throw error(404, 'Candidat introuvable');

	const role = (locals.user as { role?: string }).role ?? 'candidat';
	const isOwner = row.ownerId === locals.user.id;
	const isStaff = role === 'cre' || role === 'recruteur';
	if (!isOwner && !isStaff) throw error(403, 'Interdit');

	const path = row.fiche?.[slot] as string | null | undefined;
	if (!path) throw error(404, 'Document non déposé');

	const ext = path.split('.').pop() ?? 'bin';
	const inline = url.searchParams.get('dl') !== '1';
	return streamFile(path, `${SLOTS[slot]}.${ext}`, inline, request.headers.get('range'));
};
