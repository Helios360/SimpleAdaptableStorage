import {
	pgTable,
	text,
	timestamp,
	boolean,
	integer,
	serial,
	primaryKey,
	jsonb,
	date,
	doublePrecision,
	index
} from 'drizzle-orm/pg-core';

// ─── Formes JSONB des fiches ─────────────────────────────────────────────────
// Les fiches (étudiant / entreprise) sont stockées en JSONB plutôt qu'en tables
// dédiées : ce sont des « dumps » de formulaire affichés en bloc, rarement
// filtrés champ par champ, et le périmètre est amené à évoluer. Les dates sont
// des chaînes ISO. Voir fiche_infos (candidat) et fiche_entreprise (placement).

export interface FicheEtudiantData {
	// état civil
	nomNaissance?: string | null;
	nomUsage?: string | null;
	civilite?: string | null; // femme | homme | na
	paysNaissance?: string | null;
	communeNaissance?: string | null;
	cpNaissance?: string | null;
	// adresse de résidence
	adresseRue?: string | null; // numéro et voie
	adresseCp?: string | null;
	adresseVille?: string | null;
	nir?: string | null;
	nationalite?: string | null; // francaise | ue | hors_ue
	majeur?: boolean | null;
	// représentant légal (si mineur)
	repNom?: string | null;
	repPrenom?: string | null;
	repMail?: string | null;
	repTel?: string | null;
	repAdresse?: string | null;
	// situations particulières
	sportifHautNiveau?: boolean;
	rqth?: boolean;
	// parcours
	situationAvantContrat?: string | null; // code 1–12
	dernierDiplomePrepare?: string | null; // code
	intituleDiplomePrepare?: string | null;
	diplomeLePlusEleve?: string | null; // code
	derniereAnneeSuivie?: string | null; // code
	dejaAlternance?: boolean;
	numeroDeca?: string | null;
	// documents administratifs (chemins storage)
	titreSejourPath?: string | null;
	carteVitalePath?: string | null;
	diplomePath?: string | null;
	photoIdPath?: string | null;
	reglementInterieurPath?: string | null;
	attestationSportifPath?: string | null;
	attestationRqthPath?: string | null;
	ancienCerfaPath?: string | null;
	submittedAt?: string | null; // ISO
	updatedAt?: string | null; // ISO
}

export interface FicheEntrepriseData {
	typeContrat?: string | null; // apprentissage | professionnalisation
	// entreprise
	raisonSociale?: string | null;
	adresseSiege?: string | null;
	adresseExecution?: string | null;
	siretExecution?: string | null;
	typeEmployeur?: string | null;
	tel?: string | null;
	formeJuridique?: string | null;
	siretSiege?: string | null;
	codeApeNaf?: string | null;
	codeIdcc?: string | null;
	nbSalaries?: number | null;
	caisseRetraite?: string | null;
	prevoyance?: string | null;
	opco?: string | null;
	chefNom?: string | null;
	chefMail?: string | null;
	chefTel?: string | null;
	rhNom?: string | null;
	rhMail?: string | null;
	rhTel?: string | null;
	assuranceChomagePublic?: string | null;
	mandatOpco?: boolean;
	// contribution obligatoire (facturation)
	factuAdresse?: string | null;
	factuMail?: string | null;
	// tuteur
	tuteurNom?: string | null;
	tuteurPrenom?: string | null;
	tuteurTel?: string | null;
	tuteurDateNaissance?: string | null;
	tuteurMail?: string | null;
	tuteurFonction?: string | null;
	tuteurExperience?: number | null;
	tuteurDiplome?: string | null;
	tuteurNbAlternants?: number | null;
	// contrat
	salaireBrut?: string | null;
	smicSmc?: string | null;
	dateDebut?: string | null;
	submittedAt?: string | null; // ISO
	updatedAt?: string | null; // ISO
}

// ─── better-auth tables ──────────────────────────────────────────────────────

export const user = pgTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified').notNull().default(false),
	image: text('image'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
	// CloudStudent additions
	role: text('role').notNull().default('candidat'), // candidat | cre | recruteur
	avatar: text('avatar'),
	// École de rattachement (référentiel géré en Paramètres). Remplace l'ancien
	// libellé libre `school`. Voir table `school`.
	schoolId: integer('school_id').references(() => school.id, { onDelete: 'set null' }),
	company: text('company')
});

export const session = pgTable('session', {
	id: text('id').primaryKey(),
	expiresAt: timestamp('expires_at').notNull(),
	token: text('token').notNull().unique(),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' })
});

export const account = pgTable('account', {
	id: text('id').primaryKey(),
	accountId: text('account_id').notNull(),
	providerId: text('provider_id').notNull(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	accessToken: text('access_token'),
	refreshToken: text('refresh_token'),
	idToken: text('id_token'),
	accessTokenExpiresAt: timestamp('access_token_expires_at'),
	refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
	scope: text('scope'),
	password: text('password'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const verification = pgTable('verification', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: timestamp('expires_at').notNull(),
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at').defaultNow()
});

// ─── domain tables ──────────────────────────────────────────────────────────

// École / organisme (Cloud Campus, Skalys…). Référentiel géré en Paramètres et
// rattaché aux utilisateurs, formations, promos, offres et envois. Le `type`
// pilote les items de checklist conditionnels (voir src/lib/checklist.ts) ; il
// est dérivé du nom à la création (schoolType).
export const school = pgTable('school', {
	id: serial('id').primaryKey(),
	name: text('name').notNull().unique(),
	type: text('type').notNull().default('autre'), // cloud_campus | skalys | autre
	// Règlement intérieur de l'école : lien envoyé à l'étudiant lors de la passation.
	// Deux formes possibles, l'URL primant sur le PDF hébergé (reglementPath, déposé
	// depuis Paramètres et servi par /files/ecole/[id]/reglement).
	reglementUrl: text('reglement_url'),
	reglementPath: text('reglement_path'),
	// Modèle du mail d'envoi de la fiche étudiant, propre à l'école. Les variables
	// {{prenom}}, {{lien}}… sont substituées à l'envoi (voir src/lib/mailTemplate.ts).
	// Vide = modèle par défaut de l'application.
	mailTemplate: text('mail_template'),
	createdAt: timestamp('created_at').notNull().defaultNow()
});

export const formation = pgTable('formation', {
	id: serial('id').primaryKey(),
	code: text('code').notNull().unique(),
	name: text('name').notNull(),
	schoolId: integer('school_id').references(() => school.id, { onDelete: 'set null' }),
	// Référentiel de la formation (PDF déposé en Paramètres), servi par
	// /files/formation/[id]/referentiel.
	referentielPath: text('referentiel_path')
});

// Catalogue de compétences (référentiel), rattachables à des formations.
export const competence = pgTable('competence', {
	id: serial('id').primaryKey(),
	label: text('label').notNull().unique(),
	createdAt: timestamp('created_at').notNull().defaultNow()
});

// Liaison N-N entre formations et compétences attendues.
export const formationCompetence = pgTable(
	'formation_competence',
	{
		formationId: integer('formation_id')
			.notNull()
			.references(() => formation.id, { onDelete: 'cascade' }),
		competenceId: integer('competence_id')
			.notNull()
			.references(() => competence.id, { onDelete: 'cascade' })
	},
	(t) => ({
		pk: primaryKey({ columns: [t.formationId, t.competenceId] })
	})
);

// Promotion (cohorte) gérée depuis la page Paramètres. Entité autonome : les
// étudiants continuent d'utiliser candidat.year ; le rattachement à une promo
// pourra être câblé plus tard. formationId optionnel (ex. « BTS SIO 2025 »).
export const promo = pgTable('promo', {
	id: serial('id').primaryKey(),
	label: text('label').notNull().unique(),
	year: integer('year'),
	// Date de rentrée (ISO YYYY-MM-DD). Requise à la saisie, mais la colonne reste
	// nullable : les promos créées avant son ajout n'en ont pas.
	dateRentree: date('date_rentree'),
	formationId: integer('formation_id').references(() => formation.id, { onDelete: 'set null' }),
	schoolId: integer('school_id').references(() => school.id, { onDelete: 'set null' }),
	// Calendrier de la promo (PDF déposé en Paramètres), servi par
	// /files/promo/[id]/calendrier.
	calendrierPath: text('calendrier_path'),
	createdAt: timestamp('created_at').notNull().defaultNow()
});

export const candidat = pgTable(
	'candidat',
	{
		id: serial('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.unique()
			.references(() => user.id, { onDelete: 'cascade' }),
		// identité (lname = nom de famille, fname = prénom)
		lname: text('lname').notNull(),
		fname: text('fname').notNull(),
		tel: text('tel'),
		birth: date('birth'),
		// géoloc
		city: text('city').notNull().default(''),
		postal: text('postal'),
		lon: doublePrecision('lon'),
		lat: doublePrecision('lat'),
		// formation
		formationId: integer('formation_id').references(() => formation.id, { onDelete: 'restrict' }),
		year: integer('year'),
		// documents (chemins relatifs sur le storage)
		cvPath: text('cv_path'),
		idDocPath: text('id_doc_path'),
		idDocVersoPath: text('id_doc_verso_path'),
		pitchPath: text('pitch_path'),
		titreValide: date('titre_valide'),
		// tags & compétences (libellés libres + listes prédéfinies)
		tags: jsonb('tags').$type<string[]>().notNull().default([]),
		skills: jsonb('skills').$type<string[]>().notNull().default([]),
		// Fiche d'informations (Google Form) — 1:1 avec le candidat, en JSONB.
		ficheInfos: jsonb('fiche_infos').$type<FicheEtudiantData>(),
		// Checklist « dossier » (formulaires, Cerfa, contribution…) — map clé→coché,
		// en JSONB. Voir src/lib/checklist.ts pour les items et le tronc conditionnel.
		checklist: jsonb('checklist').$type<Record<string, boolean>>().notNull().default({}),
		// Note libre sur l'étudiant, partagée par toute l'équipe CRE (une note par
		// étudiant, éditable par n'importe quel membre : on garde l'auteur du dernier
		// enregistrement et sa date pour savoir qui dit quoi). Jamais exposée à
		// l'étudiant ni aux recruteurs.
		note: text('note'),
		noteAuthorId: text('note_author_id').references(() => user.id, { onDelete: 'set null' }),
		noteUpdatedAt: timestamp('note_updated_at'),
		// flags mobilité
		permis: boolean('permis').notNull().default(false),
		vehicule: boolean('vehicule').notNull().default(false),
		mobile: boolean('mobile').notNull().default(false),
		// scoring
		score: integer('score'),
		pitch: boolean('pitch').notNull().default(false),
		// workflow CRE (dossier)
		statut: text('statut').notNull().default('en_attente'), // en_attente | valide | refuse
		// état recherche emploi
		rechercheStatut: text('recherche_statut').notNull().default('recherche'), // active | recherche | entreprise | archive
		// RGPD
		consent: boolean('consent').notNull().default(false),
		consentedAt: timestamp('consented_at'),
		termsVersion: integer('terms_version').notNull().default(1),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow()
	},
	(t) => ({
		cityIdx: index('candidat_city_idx').on(t.city),
		statutIdx: index('candidat_statut_idx').on(t.statut),
		rechercheIdx: index('candidat_recherche_statut_idx').on(t.rechercheStatut),
		formationIdx: index('candidat_formation_idx').on(t.formationId)
	})
);

// Formations qu'un CRE a en charge (filtre par défaut sur la liste étudiants)
export const staffFormation = pgTable(
	'staff_formation',
	{
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		formationId: integer('formation_id')
			.notNull()
			.references(() => formation.id, { onDelete: 'cascade' })
	},
	(t) => ({
		pk: primaryKey({ columns: [t.userId, t.formationId] })
	})
);

export const cv = pgTable('cv', {
	id: serial('id').primaryKey(),
	candidatId: integer('candidat_id')
		.notNull()
		.references(() => candidat.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	// tag/type du CV : Alternance | Stage | CDI | CDD | Freelance | International
	tag: text('tag'),
	// un seul CV actif à la fois par candidat (sélectionné par défaut aux candidatures)
	active: boolean('active').notNull().default(false),
	path: text('path'),
	size: integer('size'),
	mime: text('mime'),
	createdAt: timestamp('created_at').notNull().defaultNow()
});

export const offre = pgTable('offre', {
	id: serial('id').primaryKey(),
	titre: text('titre').notNull(),
	entreprise: text('entreprise').notNull(),
	lieu: text('lieu').notNull(),
	type: text('type').notNull(), // Stage | Alternance | CDI | CDD
	niveau: text('niveau'), // niveau attendu (Bac+2, Bac+3…)
	description: text('description'),
	skills: jsonb('skills').$type<string[]>().notNull().default([]),
	date: text('date').notNull(),
	// publication : true = publiée, false = brouillon
	active: boolean('active').notNull().default(true),
	// rattachement CRE / école (null pour les offres seed historiques)
	schoolId: integer('school_id').references(() => school.id, { onDelete: 'set null' }),
	creId: text('cre_id').references(() => user.id, { onDelete: 'set null' }),
	createdAt: timestamp('created_at').notNull().defaultNow()
});

// Envoi groupé de profils à une entreprise
export const envoi = pgTable(
	'envoi',
	{
		id: serial('id').primaryKey(),
		entreprise: text('entreprise').notNull(),
		contact: text('contact'),
		email: text('email').notNull(),
		message: text('message'),
		opens: integer('opens').notNull().default(0),
		statut: text('statut').notNull().default('envoye'), // envoye | ouvert
		schoolId: integer('school_id').references(() => school.id, { onDelete: 'set null' }),
		creId: text('cre_id').references(() => user.id, { onDelete: 'set null' }),
		lastOpenAt: timestamp('last_open_at'),
		createdAt: timestamp('created_at').notNull().defaultNow()
	},
	(t) => ({
		creIdx: index('envoi_cre_idx').on(t.creId),
		schoolIdx: index('envoi_school_idx').on(t.schoolId)
	})
);

export const candidature = pgTable('candidature', {
	id: serial('id').primaryKey(),
	candidatId: integer('candidat_id')
		.notNull()
		.references(() => candidat.id, { onDelete: 'cascade' }),
	offreId: integer('offre_id')
		.notNull()
		.references(() => offre.id, { onDelete: 'cascade' }),
	statut: text('statut').notNull().default('envoyee'), // envoyee | entretien | refusee
	createdAt: timestamp('created_at').notNull().defaultNow()
});

export const retenu = pgTable(
	'retenu',
	{
		recruteurId: text('recruteur_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		candidatId: integer('candidat_id')
			.notNull()
			.references(() => candidat.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').notNull().defaultNow()
	},
	(t) => ({
		pk: primaryKey({ columns: [t.recruteurId, t.candidatId] })
	})
);

// ─── Placement (passation commercial → alternance) ───────────────────────────

// Un placement = une passation d'un étudiant en entreprise, créée par le
// commercial depuis le dashboard. Reprend les colonnes du suivi « candidats
// placés ». La clé étrangère candidatId relie tout au dossier étudiant existant
// (pas de duplication des infos déjà en base : nom, formation, email…).
export const placement = pgTable(
	'placement',
	{
		id: serial('id').primaryKey(),
		candidatId: integer('candidat_id')
			.notNull()
			.references(() => candidat.id, { onDelete: 'cascade' }),
		// commercial connecté qui a saisi la passation
		commercialId: text('commercial_id').references(() => user.id, { onDelete: 'set null' }),
		// « Suivi par » (nom libre, peut différer du compte qui saisit)
		suiviPar: text('suivi_par'),
		// Promo du référentiel. Le libellé reste stocké en clair : il survit à la
		// suppression de la promo et sert à l'affichage, tandis que promoId donne
		// accès à la date de rentrée et au calendrier (mails de passation).
		promo: text('promo'),
		promoId: integer('promo_id').references(() => promo.id, { onDelete: 'set null' }),
		source: text('source'),
		datePlacement: date('date_placement'),
		// entreprise (minimal à la passation ; le détail complet arrive via fiche_entreprise)
		entreprise: text('entreprise'),
		contactNom: text('contact_nom'),
		contactPrenom: text('contact_prenom'),
		contactTel: text('contact_tel'),
		// email vers lequel part le lien tokenisé de la fiche entreprise
		contactEmail: text('contact_email'),
		typeContrat: text('type_contrat'), // apprentissage | professionnalisation
		// suivi OPCO (colonne « Statut » du tableau)
		statutOpco: text('statut_opco').notNull().default('en_attente'),
		priseEnCharge: date('prise_en_charge'),
		dateRupture: date('date_rupture'),
		commentaires: text('commentaires'),
		// facturation
		factureEmise: boolean('facture_emise').notNull().default(false),
		factureDate: date('facture_date'),
		factureNumero: text('facture_numero'),
		facturePayee: boolean('facture_payee').notNull().default(false),
		// avancement du dossier de formulaires
		statut: text('statut').notNull().default('brouillon'), // brouillon | liens_envoyes | etudiant_ok | entreprise_ok | complet
		// Fiche entreprise (Fiche de renseignements Cloud Campus) — 1:1, en JSONB.
		ficheEntreprise: jsonb('fiche_entreprise').$type<FicheEntrepriseData>(),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow()
	},
	(t) => ({
		candidatIdx: index('placement_candidat_idx').on(t.candidatId),
		commercialIdx: index('placement_commercial_idx').on(t.commercialId)
	})
);

// Lien tokenisé (session sans compte) vers un formulaire public. Distinct du reset
// de mot de passe better-auth : sert aux fiches étudiant / entreprise d'un placement.
export const formToken = pgTable(
	'form_token',
	{
		token: text('token').primaryKey(),
		placementId: integer('placement_id')
			.notNull()
			.references(() => placement.id, { onDelete: 'cascade' }),
		audience: text('audience').notNull(), // etudiant | entreprise
		expiresAt: timestamp('expires_at').notNull(),
		submittedAt: timestamp('submitted_at'),
		// Relance automatique : dernière relance envoyée et compteur, pour ne pas
		// re-notifier plus souvent que le délai (voir src/lib/relanceLogic.ts).
		lastRelanceAt: timestamp('last_relance_at'),
		relanceCount: integer('relance_count').notNull().default(0),
		createdAt: timestamp('created_at').notNull().defaultNow()
	},
	(t) => ({
		placementIdx: index('form_token_placement_idx').on(t.placementId)
	})
);

export type User = typeof user.$inferSelect;
export type School = typeof school.$inferSelect;
export type Formation = typeof formation.$inferSelect;
export type Promo = typeof promo.$inferSelect;
export type Competence = typeof competence.$inferSelect;
export type FormationCompetence = typeof formationCompetence.$inferSelect;
export type Candidat = typeof candidat.$inferSelect;
export type Offre = typeof offre.$inferSelect;
export type Candidature = typeof candidature.$inferSelect;
export type Cv = typeof cv.$inferSelect;
export type Envoi = typeof envoi.$inferSelect;
export type Placement = typeof placement.$inferSelect;
export type FormToken = typeof formToken.$inferSelect;
