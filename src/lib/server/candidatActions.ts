/**
 * Actions CRE partagées autour d'un dossier candidat (édition, documents,
 * validation, suppression, reset). Utilisées à la fois par la liste
 * (/cre/etudiants) et par la page de détail (/cre/etudiants/[id]) pour éviter
 * de dupliquer la logique.
 */
import { fail, type RequestEvent } from '@sveltejs/kit';
import { and, eq, ne } from 'drizzle-orm';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { candidat, candidature, cv, user } from '$lib/server/db/schema';
import { requireRole } from '$lib/server/guards';
import {
	saveUpload,
	validateUpload,
	deleteUpload,
	mimeFor,
	INSCRIPTION_SLOTS,
	type FileSlot
} from '$lib/server/uploads';
import { updateInscriptionDocFor, removeInscriptionDocFor } from '$lib/server/inscription';
import { deleteCandidatForUser } from '$lib/server/deletion';
import { sanitizeChecklist } from '$lib/checklist';

const VALID_STATUTS = new Set(['valide', 'refuse', 'en_attente']);
const VALID_RECHERCHE = new Set(['active', 'recherche', 'entreprise', 'archive']);
const CV_SLOT: FileSlot = { allowed: ['pdf'], maxMB: 5, label: 'CV' };
const REG_CV_SLOT = INSCRIPTION_SLOTS.cv;
const ID_SLOT = INSCRIPTION_SLOTS.id_recto;

function parseJsonArray(raw: unknown): string[] {
	if (typeof raw !== 'string' || !raw) return [];
	try {
		const v = JSON.parse(raw);
		return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
	} catch {
		return [];
	}
}
function strOrNull(raw: unknown): string | null {
	const s = String(raw ?? '').trim();
	return s ? s : null;
}
function intOrNull(raw: unknown): number | null {
	const s = String(raw ?? '').trim();
	if (!s) return null;
	const n = Number(s);
	return Number.isFinite(n) ? n : null;
}

function emailPrefix(email: string): string {
	const at = email.indexOf('@');
	return at > 0 ? email.slice(0, at) : email;
}

function randomPassword(): string {
	return crypto.randomUUID() + crypto.randomUUID();
}

async function setStatut({ request, locals }: RequestEvent) {
	requireRole(locals.user, 'cre');
	const form = await request.formData();
	const id = Number(form.get('id'));
	const statut = String(form.get('statut') ?? '');
	if (!Number.isFinite(id) || !VALID_STATUTS.has(statut)) return fail(400);

	// Aucun verrou de validation : l'admin valide toujours le dossier, même si des
	// champs ou des documents (CV, pièce d'identité, test IA) sont manquants.
	await db.update(candidat).set({ statut, updatedAt: new Date() }).where(eq(candidat.id, id));

	// Propagation sur les candidatures du dossier.
	if (statut === 'valide') {
		// Le dossier validé est officiellement envoyé : on (re)place les candidatures
		// non confirmées en entretien sur "envoyée".
		await db
			.update(candidature)
			.set({ statut: 'envoyee' })
			.where(and(eq(candidature.candidatId, id), ne(candidature.statut, 'entretien')));
	} else if (statut === 'refuse') {
		await db
			.update(candidature)
			.set({ statut: 'refusee' })
			.where(eq(candidature.candidatId, id));
	}

	return { success: true, statut };
}

// Checklist « dossier » : on ne conserve que les clés connues (sanitizeChecklist)
// et on écrase l'objet JSONB. Le front pilote l'affichage conditionnel par école.
async function updateChecklist({ request, locals }: RequestEvent) {
	requireRole(locals.user, 'cre');
	const form = await request.formData();
	const id = Number(form.get('id'));
	if (!Number.isFinite(id)) return fail(400);
	let parsed: unknown = {};
	try {
		parsed = JSON.parse(String(form.get('checklist') ?? '{}'));
	} catch {
		return fail(400);
	}
	const checklist = sanitizeChecklist(parsed);
	await db.update(candidat).set({ checklist, updatedAt: new Date() }).where(eq(candidat.id, id));
	return { success: true, checklist };
}

async function setRechercheStatut({ request, locals }: RequestEvent) {
	requireRole(locals.user, 'cre');
	const form = await request.formData();
	const id = Number(form.get('id'));
	const rechercheStatut = String(form.get('rechercheStatut') ?? '');
	if (!Number.isFinite(id) || !VALID_RECHERCHE.has(rechercheStatut)) return fail(400);
	await db
		.update(candidat)
		.set({ rechercheStatut, updatedAt: new Date() })
		.where(eq(candidat.id, id));
	return { success: true, rechercheStatut };
}

async function addStudent({ request, locals }: RequestEvent) {
	requireRole(locals.user, 'cre');
	const form = await request.formData();
	const email = String(form.get('email') ?? '').toLowerCase().trim();
	const formationIdRaw = form.get('formationId');
	const formationId = formationIdRaw ? Number(formationIdRaw) : NaN;
	const fname = String(form.get('fname') ?? '').trim();
	const lname = String(form.get('lname') ?? '').trim();
	const tel = String(form.get('tel') ?? '').trim();
	const city = String(form.get('city') ?? '').trim();
	const postal = String(form.get('postal') ?? '').trim();
	const birth = String(form.get('birth') ?? '').trim();
	const yearRaw = form.get('year');
	const year = yearRaw && String(yearRaw).trim() !== '' ? Number(yearRaw) : null;
	const cvFile = form.get('cv') as File | null;
	const idDocFile = form.get('idDoc') as File | null;
	const idDocVersoFile = form.get('idDocVerso') as File | null;

	if (!/\S+@\S+\.\S+/.test(email)) return fail(400, { error: 'Email invalide.' });
	if (!Number.isFinite(formationId)) return fail(400, { error: 'Formation requise.' });

	const hasCv = cvFile instanceof File && cvFile.size > 0;
	const hasIdRecto = idDocFile instanceof File && idDocFile.size > 0;
	const hasIdVerso = idDocVersoFile instanceof File && idDocVersoFile.size > 0;
	if (hasCv) {
		const err = validateUpload(cvFile, REG_CV_SLOT);
		if (err) return fail(400, { error: err });
	}
	if (hasIdRecto) {
		const err = validateUpload(idDocFile, ID_SLOT);
		if (err) return fail(400, { error: err });
	}
	if (hasIdVerso) {
		const err = validateUpload(idDocVersoFile, ID_SLOT);
		if (err) return fail(400, { error: err });
	}

	const fallback = emailPrefix(email);
	const safeFname = fname || fallback;
	const safeLname = lname || fallback;
	const name = `${safeFname} ${safeLname}`.trim();
	const avatar = ((safeFname[0] ?? '') + (safeLname[0] ?? '')).toUpperCase();

	let signupRes: Response;
	try {
		signupRes = await auth.api.signUpEmail({
			body: { email, password: randomPassword(), name, role: 'candidat', avatar } as never,
			asResponse: true
		});
	} catch {
		return fail(400, { error: 'Impossible de créer le compte (email déjà utilisé ?).' });
	}
	if (!signupRes.ok) return fail(400, { error: 'Impossible de créer le compte (email déjà utilisé ?).' });

	// Important : on ne forwarde PAS les cookies — l'admin garde sa session.
	const body = (await signupRes.clone().json().catch(() => null)) as { user?: { id?: string } } | null;
	const userId = body?.user?.id;
	if (!userId) return fail(500, { error: 'Erreur interne (utilisateur non créé).' });

	let cvPath: string | null = null;
	let idDocPath: string | null = null;
	let idDocVersoPath: string | null = null;
	if (hasCv) {
		cvPath = await saveUpload(`candidat/${userId}/inscription`, `cv_${Date.now()}`, cvFile as File);
	}
	if (hasIdRecto) {
		idDocPath = await saveUpload(`candidat/${userId}/inscription`, `id_recto_${Date.now()}`, idDocFile as File);
	}
	if (hasIdVerso) {
		idDocVersoPath = await saveUpload(`candidat/${userId}/inscription`, `id_verso_${Date.now()}`, idDocVersoFile as File);
	}

	await db.insert(candidat).values({
		userId,
		lname: safeLname,
		fname: safeFname,
		tel: tel || null,
		city: city || '',
		postal: postal || null,
		birth: birth || null,
		formationId,
		year,
		cvPath,
		idDocPath,
		idDocVersoPath,
		statut: 'valide'
	});

	try {
		await auth.api.requestPasswordReset({
			body: { email, redirectTo: '/reset-password' } as never
		});
	} catch (e) {
		console.error('requestPasswordReset failed:', e);
		return fail(500, { error: 'Compte créé mais envoi du mail de réinitialisation échoué.' });
	}

	return { addedStudent: { email, name } };
}

async function updateCandidat({ request, locals }: RequestEvent) {
	requireRole(locals.user, 'cre');
	const form = await request.formData();
	const id = Number(form.get('id'));
	if (!Number.isFinite(id)) return fail(400, { error: 'ID invalide' });

	const lname = String(form.get('lname') ?? '').trim();
	const fname = String(form.get('fname') ?? '').trim();
	if (!lname || !fname) return fail(400, { error: 'Nom et prénom requis' });

	const rechercheStatut = String(form.get('rechercheStatut') ?? '');
	const updates: Partial<typeof candidat.$inferInsert> = {
		lname,
		fname,
		tel: strOrNull(form.get('tel')),
		city: String(form.get('city') ?? '').trim(),
		postal: strOrNull(form.get('postal')),
		birth: strOrNull(form.get('birth')),
		formationId: intOrNull(form.get('formationId')),
		year: intOrNull(form.get('year')),
		permis: form.get('permis') === '1',
		vehicule: form.get('vehicule') === '1',
		mobile: form.get('mobile') === '1',
		tags: parseJsonArray(form.get('tags')),
		skills: parseJsonArray(form.get('skills')),
		titreValide: strOrNull(form.get('titreValide')),
		updatedAt: new Date()
	};
	if (VALID_RECHERCHE.has(rechercheStatut)) updates.rechercheStatut = rechercheStatut;

	await db.update(candidat).set(updates).where(eq(candidat.id, id));
	return { success: true };
}

async function adminAddCv({ request, locals }: RequestEvent) {
	requireRole(locals.user, 'cre');
	const form = await request.formData();
	const candidatId = Number(form.get('candidatId'));
	const name = String(form.get('name') ?? '').trim();
	const file = form.get('file') as File | null;

	if (!Number.isFinite(candidatId) || !name) return fail(400, { error: 'Champs requis' });
	const err = validateUpload(file, CV_SLOT);
	if (err) return fail(400, { error: err });

	const rows = await db
		.select({ userId: candidat.userId })
		.from(candidat)
		.where(eq(candidat.id, candidatId))
		.limit(1);
	const ownerId = rows[0]?.userId;
	if (!ownerId) return fail(404, { error: 'Candidat introuvable' });

	const f = file as File;
	const slug = `${Date.now()}_${name.replace(/[^a-z0-9]+/gi, '-').slice(0, 40) || 'cv'}`;
	const path = await saveUpload(`candidat/${ownerId}/cvs`, slug, f);

	await db.insert(cv).values({
		candidatId,
		name,
		path,
		size: f.size,
		mime: mimeFor(f.name)
	});
	return { success: true };
}

async function adminRemoveCv({ request, locals }: RequestEvent) {
	requireRole(locals.user, 'cre');
	const form = await request.formData();
	const candidatId = Number(form.get('candidatId'));
	const cvId = Number(form.get('cvId'));
	if (!Number.isFinite(candidatId) || !Number.isFinite(cvId)) return fail(400);

	const rows = await db
		.select({ path: cv.path })
		.from(cv)
		.where(and(eq(cv.id, cvId), eq(cv.candidatId, candidatId)))
		.limit(1);

	await db.delete(cv).where(and(eq(cv.id, cvId), eq(cv.candidatId, candidatId)));
	if (rows[0]?.path) await deleteUpload(rows[0].path);
	return { success: true };
}

async function updateInscriptionDoc({ request, locals }: RequestEvent) {
	requireRole(locals.user, 'cre');
	return updateInscriptionDocFor(await request.formData(), null);
}

async function removeInscriptionDoc({ request, locals }: RequestEvent) {
	requireRole(locals.user, 'cre');
	return removeInscriptionDocFor(await request.formData(), null);
}

async function deleteStudent({ request, locals }: RequestEvent) {
	requireRole(locals.user, 'cre');
	const form = await request.formData();
	const id = Number(form.get('id'));
	if (!Number.isFinite(id)) return fail(400, { error: 'ID invalide' });

	const rows = await db
		.select({ userId: candidat.userId })
		.from(candidat)
		.where(eq(candidat.id, id))
		.limit(1);
	const userId = rows[0]?.userId;
	if (!userId) return fail(404, { error: 'Candidat introuvable' });

	const ok = await deleteCandidatForUser(userId);
	if (!ok) return fail(404, { error: 'Compte déjà supprimé' });
	return { success: true };
}

async function sendReset({ request, locals }: RequestEvent) {
	requireRole(locals.user, 'cre');
	const form = await request.formData();
	const id = Number(form.get('id'));
	if (!Number.isFinite(id)) return fail(400, { error: 'ID invalide' });

	const rows = await db
		.select({ email: user.email })
		.from(candidat)
		.innerJoin(user, eq(user.id, candidat.userId))
		.where(eq(candidat.id, id))
		.limit(1);
	const email = rows[0]?.email;
	if (!email) return fail(404, { error: 'Candidat introuvable' });

	try {
		await auth.api.requestPasswordReset({
			body: { email, redirectTo: '/reset-password' } as never
		});
	} catch (e) {
		console.error('requestPasswordReset failed:', e);
		return fail(500, { error: "Échec de l'envoi du mail de réinitialisation." });
	}
	return { resetSent: email };
}

/** Actions partagées par la liste et la page de détail candidat. */
export const candidatActions = {
	setStatut,
	updateChecklist,
	setRechercheStatut,
	addStudent,
	updateCandidat,
	adminAddCv,
	adminRemoveCv,
	updateInscriptionDoc,
	removeInscriptionDoc,
	deleteStudent,
	sendReset
};
