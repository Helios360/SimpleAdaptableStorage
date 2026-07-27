/**
 * Enregistrement des formulaires publics (fiche étudiant / fiche entreprise)
 * soumis via un lien tokenisé. Gère les uploads de documents, l'écriture des
 * fiches en JSONB (candidat.ficheInfos / placement.ficheEntreprise), le marquage
 * du token comme soumis et l'avancement du statut du placement.
 */
import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from './db';
import {
	candidat,
	placement,
	formToken,
	type FicheEtudiantData,
	type FicheEntrepriseData
} from './db/schema';
import { saveOptionalUpload, type FileSlot } from './uploads';
import {
	parseFormStr as s,
	parseFormBool as b,
	parseFormInt as i,
	computePlacementStatut
} from '$lib/placementLogic';

// Les pièces jointes des fiches acceptent PDF ou image, 8 Mo max.
const DOC_SLOT: FileSlot = {
	allowed: ['pdf', 'png', 'jpg', 'jpeg', 'webp'],
	maxMB: 8,
	label: 'Document'
};

/** Recalcule le statut du placement selon l'état de soumission des deux fiches. */
async function advancePlacement(placementId: number, candidatId: number) {
	const [cand] = await db
		.select({ fiche: candidat.ficheInfos })
		.from(candidat)
		.where(eq(candidat.id, candidatId))
		.limit(1);
	const [pl] = await db
		.select({ fiche: placement.ficheEntreprise })
		.from(placement)
		.where(eq(placement.id, placementId))
		.limit(1);
	const statut = computePlacementStatut(!!cand?.fiche?.submittedAt, !!pl?.fiche?.submittedAt);
	await db
		.update(placement)
		.set({ statut, updatedAt: new Date() })
		.where(eq(placement.id, placementId));
}

interface TokenRow {
	token: string;
	placementId: number;
	audience: string;
}

// ─── Lecture des champs scalaires depuis un FormData ─────────────────────────
// Source unique partagée par la soumission tokenisée (save*) et l'édition CRE
// (update*), pour éviter que les deux listes de champs ne divergent. Les
// documents (…Path) et les horodatages sont gérés par les appelants.

/** Champs scalaires de la fiche étudiante (hors documents & horodatages). */
function readFicheEtudiantScalars(form: FormData): Partial<FicheEtudiantData> {
	return {
		nomNaissance: s(form.get('nomNaissance')),
		nomUsage: s(form.get('nomUsage')),
		civilite: s(form.get('civilite')),
		paysNaissance: s(form.get('paysNaissance')),
		communeNaissance: s(form.get('communeNaissance')),
		cpNaissance: s(form.get('cpNaissance')),
		adresseRue: s(form.get('adresseRue')),
		adresseCp: s(form.get('adresseCp')),
		adresseVille: s(form.get('adresseVille')),
		nir: s(form.get('nir')),
		nationalite: s(form.get('nationalite')),
		majeur: b(form.get('majeur')),
		repNom: s(form.get('repNom')),
		repPrenom: s(form.get('repPrenom')),
		repMail: s(form.get('repMail')),
		repTel: s(form.get('repTel')),
		repAdresse: s(form.get('repAdresse')),
		sportifHautNiveau: b(form.get('sportifHautNiveau')),
		rqth: b(form.get('rqth')),
		situationAvantContrat: s(form.get('situationAvantContrat')),
		dernierDiplomePrepare: s(form.get('dernierDiplomePrepare')),
		intituleDiplomePrepare: s(form.get('intituleDiplomePrepare')),
		diplomeLePlusEleve: s(form.get('diplomeLePlusEleve')),
		derniereAnneeSuivie: s(form.get('derniereAnneeSuivie')),
		dejaAlternance: b(form.get('dejaAlternance')),
		numeroDeca: s(form.get('numeroDeca'))
	};
}

/** Champs scalaires de la fiche entreprise (hors `assuranceChomagePublic` & horodatages). */
function readFicheEntrepriseScalars(form: FormData): Partial<FicheEntrepriseData> {
	// Un tuteur ne peut encadrer plus de 2 alternants : on borne la valeur reçue.
	const nbAlternants = i(form.get('tuteurNbAlternants'));
	return {
		typeContrat: s(form.get('typeContrat')),
		raisonSociale: s(form.get('raisonSociale')),
		adresseSiege: s(form.get('adresseSiege')),
		adresseExecution: s(form.get('adresseExecution')),
		siretExecution: s(form.get('siretExecution')),
		typeEmployeur: s(form.get('typeEmployeur')),
		tel: s(form.get('tel')),
		formeJuridique: s(form.get('formeJuridique')),
		siretSiege: s(form.get('siretSiege')),
		codeApeNaf: s(form.get('codeApeNaf')),
		codeIdcc: s(form.get('codeIdcc')),
		nbSalaries: i(form.get('nbSalaries')),
		caisseRetraite: s(form.get('caisseRetraite')),
		prevoyance: s(form.get('prevoyance')),
		opco: s(form.get('opco')),
		chefNom: s(form.get('chefNom')),
		chefMail: s(form.get('chefMail')),
		chefTel: s(form.get('chefTel')),
		rhNom: s(form.get('rhNom')),
		rhMail: s(form.get('rhMail')),
		rhTel: s(form.get('rhTel')),
		mandatOpco: b(form.get('mandatOpco')),
		factuAdresse: s(form.get('factuAdresse')),
		factuMail: s(form.get('factuMail')),
		tuteurNom: s(form.get('tuteurNom')),
		tuteurPrenom: s(form.get('tuteurPrenom')),
		tuteurTel: s(form.get('tuteurTel')),
		tuteurDateNaissance: s(form.get('tuteurDateNaissance')),
		tuteurMail: s(form.get('tuteurMail')),
		tuteurFonction: s(form.get('tuteurFonction')),
		tuteurExperience: i(form.get('tuteurExperience')),
		tuteurDiplome: s(form.get('tuteurDiplome')),
		tuteurNbAlternants: nbAlternants == null ? null : Math.max(0, Math.min(2, nbAlternants)),
		salaireBrut: s(form.get('salaireBrut')),
		smicSmc: s(form.get('smicSmc')),
		dateDebut: s(form.get('dateDebut'))
	};
}

/** Enregistre la fiche d'informations étudiante dans candidat.ficheInfos (JSONB). */
export async function saveFicheEtudiant(tok: TokenRow, form: FormData) {
	const rows = await db
		.select({ candidatId: placement.candidatId, userId: candidat.userId, fiche: candidat.ficheInfos })
		.from(placement)
		.innerJoin(candidat, eq(candidat.id, placement.candidatId))
		.where(eq(placement.id, tok.placementId))
		.limit(1);
	const ctx = rows[0];
	if (!ctx) return fail(404, { error: 'Dossier introuvable.' });
	const prev = ctx.fiche ?? {};

	const relDir = `candidat/${ctx.userId}/fiche`;
	const fileFields: [string, keyof FicheEtudiantData][] = [
		['attestationSportif', 'attestationSportifPath'],
		['attestationRqth', 'attestationRqthPath'],
		['ancienCerfa', 'ancienCerfaPath'],
		['titreSejour', 'titreSejourPath'],
		['carteVitale', 'carteVitalePath'],
		['diplome', 'diplomePath'],
		['photoId', 'photoIdPath'],
		['reglementInterieur', 'reglementInterieurPath']
	];
	const paths: Partial<FicheEtudiantData> = {};
	for (const [field, col] of fileFields) {
		const res = await saveOptionalUpload(
			form,
			field,
			DOC_SLOT,
			relDir,
			field,
			prev[col] as string | null
		);
		if (res.error) return fail(400, { error: res.error });
		(paths as Record<string, string | null>)[col] = res.path;
	}

	const data: FicheEtudiantData = {
		...readFicheEtudiantScalars(form),
		...paths,
		submittedAt: new Date().toISOString(),
		updatedAt: new Date().toISOString()
	};

	await db.update(candidat).set({ ficheInfos: data, updatedAt: new Date() }).where(eq(candidat.id, ctx.candidatId));
	await db.update(formToken).set({ submittedAt: new Date() }).where(eq(formToken.token, tok.token));
	await advancePlacement(tok.placementId, ctx.candidatId);
	return { success: true };
}

/** Enregistre la fiche entreprise dans placement.ficheEntreprise (JSONB). */
export async function saveFicheEntreprise(tok: TokenRow, form: FormData) {
	const [pl] = await db
		.select({ candidatId: placement.candidatId })
		.from(placement)
		.where(eq(placement.id, tok.placementId))
		.limit(1);
	if (!pl) return fail(404, { error: 'Dossier introuvable.' });

	const data: FicheEntrepriseData = {
		...readFicheEntrepriseScalars(form),
		assuranceChomagePublic: s(form.get('assuranceChomagePublic')),
		submittedAt: new Date().toISOString(),
		updatedAt: new Date().toISOString()
	};

	await db
		.update(placement)
		.set({ ficheEntreprise: data, updatedAt: new Date() })
		.where(eq(placement.id, tok.placementId));
	await db.update(formToken).set({ submittedAt: new Date() }).where(eq(formToken.token, tok.token));
	await advancePlacement(tok.placementId, pl.candidatId);
	return { success: true };
}

// ─── Édition côté CRE (sans token) ──────────────────────────────────────────
// Le commercial peut corriger/compléter les deux fiches depuis le dossier. On
// ne touche qu'aux champs scalaires : les documents (…Path) et l'horodatage de
// soumission (submittedAt) sont conservés via l'étalement de la fiche existante.

/** Met à jour les champs scalaires de la fiche étudiante (candidat.ficheInfos). */
export async function updateFicheEtudiant(candidatId: number, form: FormData) {
	const [row] = await db
		.select({ fiche: candidat.ficheInfos })
		.from(candidat)
		.where(eq(candidat.id, candidatId))
		.limit(1);
	if (!row) return fail(404, { error: 'Dossier introuvable.' });
	const prev = row.fiche ?? {};

	const data: FicheEtudiantData = {
		...prev,
		...readFicheEtudiantScalars(form),
		updatedAt: new Date().toISOString()
	};

	await db
		.update(candidat)
		.set({ ficheInfos: data, updatedAt: new Date() })
		.where(eq(candidat.id, candidatId));
	return { success: true };
}

/** Met à jour les champs scalaires de la fiche entreprise (placement.ficheEntreprise). */
export async function updateFicheEntreprise(placementId: number, form: FormData) {
	const [pl] = await db
		.select({ candidatId: placement.candidatId, fiche: placement.ficheEntreprise })
		.from(placement)
		.where(eq(placement.id, placementId))
		.limit(1);
	if (!pl) return fail(404, { error: 'Placement introuvable.' });
	const prev = pl.fiche ?? {};

	const data: FicheEntrepriseData = {
		...prev,
		...readFicheEntrepriseScalars(form),
		updatedAt: new Date().toISOString()
	};

	await db
		.update(placement)
		.set({ ficheEntreprise: data, updatedAt: new Date() })
		.where(eq(placement.id, placementId));
	return { success: true };
}
