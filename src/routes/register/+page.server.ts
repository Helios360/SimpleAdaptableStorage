import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { candidat, formation as formationTable } from '$lib/server/db/schema';
import { listFormations } from '$lib/server/queries';
import { saveUpload, validateUpload, type FileSlot } from '$lib/server/uploads';

const CV_SLOT: FileSlot = { allowed: ['pdf'], maxMB: 2, label: 'CV' };
const ID_RECTO_SLOT: FileSlot = {
	allowed: ['pdf', 'png', 'jpg', 'jpeg'],
	maxMB: 3,
	label: "Pièce d'identité (recto)"
};
const ID_VERSO_SLOT: FileSlot = {
	allowed: ['pdf', 'png', 'jpg', 'jpeg'],
	maxMB: 3,
	label: "Pièce d'identité (verso)"
};

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		const role = (locals.user as { role?: string }).role ?? 'candidat';
		if (role === 'candidat') {
			const rows = await db
				.select({ statut: candidat.statut })
				.from(candidat)
				.where(eq(candidat.userId, locals.user.id))
				.limit(1);
			const statut = rows[0]?.statut;
			if (statut && statut !== 'valide') throw redirect(303, '/register/pending');
		}
		throw redirect(303, `/${role}`);
	}
	const formations = await listFormations();
	return { formations };
};

function forwardCookies(res: Response, cookies: import('@sveltejs/kit').Cookies) {
	for (const raw of res.headers.getSetCookie()) {
		const segments = raw.split(';').map((s) => s.trim());
		const [head, ...rest] = segments;
		const eq = head.indexOf('=');
		const name = head.slice(0, eq);
		const value = decodeURIComponent(head.slice(eq + 1));
		const opts: Parameters<typeof cookies.set>[2] = { path: '/' };
		for (const part of rest) {
			const [k, v = ''] = part.split('=');
			switch (k.toLowerCase()) {
				case 'path': opts.path = v; break;
				case 'max-age': opts.maxAge = parseInt(v, 10); break;
				case 'expires': opts.expires = new Date(v); break;
				case 'httponly': opts.httpOnly = true; break;
				case 'secure': opts.secure = true; break;
				case 'samesite': opts.sameSite = v.toLowerCase() as 'lax' | 'strict' | 'none'; break;
				case 'domain': opts.domain = v; break;
			}
		}
		cookies.set(name, value, opts);
	}
}

function initialsOf(fname: string, lname: string): string {
	return ((fname[0] ?? '') + (lname[0] ?? '')).toUpperCase();
}

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const form = await request.formData();
		const fname = String(form.get('fname') ?? '').trim();
		const lname = String(form.get('lname') ?? '').trim();
		const email = String(form.get('email') ?? '').toLowerCase().trim();
		const password = String(form.get('password') ?? '');
		const confirm = String(form.get('confirm') ?? '');
		const formationIdRaw = String(form.get('formation') ?? '').trim();
		const formationId = Number.parseInt(formationIdRaw, 10);
		const city = String(form.get('ville') ?? '').trim();
		const tel = String(form.get('tel') ?? '').trim();
		const sejour = form.get('sejour') != null;
		const titreRaw = String(form.get('titre') ?? '').trim();

		const cvFile = form.get('cv') as File | null;
		const idRecto = form.get('id_doc') as File | null;
		const idVerso = form.get('id_doc_verso') as File | null;

		const values = { fname, lname, email, formation: formationIdRaw, ville: city, tel };

		if (!fname || !lname) return fail(400, { ...values, error: 'Nom et prénom requis.' });
		if (!/\S+@\S+\.\S+/.test(email)) return fail(400, { ...values, error: 'Email invalide.' });
		if (password.length < 4) return fail(400, { ...values, error: 'Mot de passe trop court (4 caractères min).' });
		if (password !== confirm) return fail(400, { ...values, error: 'Les mots de passe ne correspondent pas.' });
		if (!Number.isInteger(formationId)) return fail(400, { ...values, error: 'Formation requise.' });
		const formationRow = await db
			.select({ id: formationTable.id })
			.from(formationTable)
			.where(eq(formationTable.id, formationId))
			.limit(1);
		if (!formationRow[0]) return fail(400, { ...values, error: 'Formation invalide.' });
		if (!city) return fail(400, { ...values, error: 'Ville requise.' });
		if (!tel) return fail(400, { ...values, error: 'Téléphone requis.' });

		if (sejour && !titreRaw) {
			return fail(400, { ...values, error: "Date d'invalidité du titre de séjour requise." });
		}
		let titreDate: string | null = null;
		if (sejour) {
			const d = new Date(titreRaw);
			if (Number.isNaN(d.getTime())) {
				return fail(400, { ...values, error: "Date du titre de séjour invalide." });
			}
			titreDate = titreRaw;
		}

		for (const [file, slot] of [
			[cvFile, CV_SLOT],
			[idRecto, ID_RECTO_SLOT],
			[idVerso, ID_VERSO_SLOT]
		] as const) {
			const err = validateUpload(file, slot);
			if (err) return fail(400, { ...values, error: err });
		}

		const name = `${fname} ${lname}`;
		const avatar = initialsOf(fname, lname);

		let res: Response;
		try {
			res = await auth.api.signUpEmail({
				body: { email, password, name, role: 'candidat', avatar } as never,
				asResponse: true,
				headers: request.headers
			});
		} catch {
			return fail(400, { ...values, error: 'Impossible de créer le compte (email déjà utilisé ?).' });
		}
		if (!res.ok) return fail(400, { ...values, error: 'Impossible de créer le compte (email déjà utilisé ?).' });

		const body = (await res.clone().json().catch(() => null)) as { user?: { id?: string } } | null;
		const userId = body?.user?.id;
		if (!userId) return fail(500, { ...values, error: 'Erreur interne (utilisateur non créé).' });

		let cvPath: string;
		let idDocPath: string;
		let idDocVersoPath: string;
		try {
			[cvPath, idDocPath, idDocVersoPath] = await Promise.all([
				saveUpload(`candidat/${userId}`, 'cv', cvFile as File),
				saveUpload(`candidat/${userId}`, 'id_recto', idRecto as File),
				saveUpload(`candidat/${userId}`, 'id_verso', idVerso as File)
			]);
		} catch {
			return fail(500, { ...values, error: "Erreur lors de l'enregistrement des fichiers." });
		}

		await db.insert(candidat).values({
			userId,
			lname,
			fname,
			tel,
			city,
			formationId,
			cvPath,
			idDocPath,
			idDocVersoPath,
			titreValide: titreDate,
			statut: 'en_attente'
		});

		forwardCookies(res, cookies);
		throw redirect(303, '/register/pending');
	}
};
