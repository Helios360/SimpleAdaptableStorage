import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { placement, candidat, formation } from '$lib/server/db/schema';
import { resolveFormToken } from '$lib/server/placement';
import { saveFicheEtudiant, saveFicheEntreprise } from '$lib/server/fiche';

export const load: PageServerLoad = async ({ params }) => {
	const tok = await resolveFormToken(params.token);
	if (!tok) return { valid: false as const };

	const [pl] = await db
		.select({
			candidatId: placement.candidatId,
			entreprise: placement.entreprise,
			typeContrat: placement.typeContrat,
			contactNom: placement.contactNom,
			contactPrenom: placement.contactPrenom,
			ficheEntreprise: placement.ficheEntreprise,
			fname: candidat.fname,
			lname: candidat.lname,
			city: candidat.city,
			postal: candidat.postal,
			tel: candidat.tel,
			birth: candidat.birth,
			ficheInfos: candidat.ficheInfos,
			formation: formation.name
		})
		.from(placement)
		.innerJoin(candidat, eq(candidat.id, placement.candidatId))
		.leftJoin(formation, eq(formation.id, candidat.formationId))
		.where(eq(placement.id, tok.placementId))
		.limit(1);

	if (!pl) return { valid: false as const };

	if (tok.audience === 'etudiant') {
		return {
			valid: true as const,
			audience: 'etudiant' as const,
			submitted: !!tok.submittedAt,
			// infos déjà connues (affichées en lecture seule, non redemandées)
			known: {
				nom: pl.lname,
				prenom: pl.fname,
				ville: pl.city,
				cp: pl.postal,
				tel: pl.tel,
				naissance: pl.birth,
				formation: pl.formation
			},
			fiche: pl.ficheInfos ?? null
		};
	}

	return {
		valid: true as const,
		audience: 'entreprise' as const,
		submitted: !!tok.submittedAt,
		entreprise: pl.entreprise,
		typeContrat: pl.typeContrat,
		contact: `${pl.contactPrenom ?? ''} ${pl.contactNom ?? ''}`.trim(),
		apprenti: `${pl.fname} ${pl.lname}`.trim(),
		fiche: pl.ficheEntreprise ?? null
	};
};

export const actions: Actions = {
	submitEtudiant: async ({ params, request }) => {
		const tok = await resolveFormToken(params.token);
		if (!tok || tok.audience !== 'etudiant') return fail(403, { error: 'Lien invalide ou expiré.' });
		return saveFicheEtudiant(tok, await request.formData());
	},
	submitEntreprise: async ({ params, request }) => {
		const tok = await resolveFormToken(params.token);
		if (!tok || tok.audience !== 'entreprise') return fail(403, { error: 'Lien invalide ou expiré.' });
		return saveFicheEntreprise(tok, await request.formData());
	}
};
