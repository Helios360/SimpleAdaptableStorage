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
	smallint,
	bigserial,
	index
} from 'drizzle-orm/pg-core';

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
	school: text('school'),
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

export const formation = pgTable('formation', {
	id: serial('id').primaryKey(),
	code: text('code').notNull().unique(),
	name: text('name').notNull()
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
		// adresse + géoloc
		addr: text('addr'),
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
		titreValide: date('titre_valide'),
		// tags & compétences (libellés libres + listes prédéfinies)
		tags: jsonb('tags').$type<string[]>().notNull().default([]),
		skills: jsonb('skills').$type<string[]>().notNull().default([]),
		// flags mobilité
		permis: boolean('permis').notNull().default(false),
		vehicule: boolean('vehicule').notNull().default(false),
		mobile: boolean('mobile').notNull().default(false),
		// scoring
		score: integer('score'),
		tosa: integer('tosa'),
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
	type: text('type').notNull(), // Stage | Alternance | CDI
	date: text('date').notNull(),
	createdAt: timestamp('created_at').notNull().defaultNow()
});

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

// Tests IA / banque de questions
export const test = pgTable('test', {
	id: serial('id').primaryKey(),
	question: text('question').notNull(),
	answer: text('answer').notNull(),
	type: smallint('type').notNull(),
	difficulty: smallint('difficulty').notNull()
});

export const testAttempt = pgTable(
	'test_attempt',
	{
		id: bigserial('id', { mode: 'number' }).primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		testId: integer('test_id')
			.notNull()
			.references(() => test.id, { onDelete: 'cascade' }),
		response: text('response'),
		score: integer('score'),
		createdAt: timestamp('created_at').notNull().defaultNow()
	},
	(t) => ({
		userIdx: index('test_attempt_user_idx').on(t.userId),
		testIdx: index('test_attempt_test_idx').on(t.testId),
		userTestIdx: index('test_attempt_user_test_creation_idx').on(t.userId, t.testId, t.createdAt)
	})
);

export type User = typeof user.$inferSelect;
export type Formation = typeof formation.$inferSelect;
export type Candidat = typeof candidat.$inferSelect;
export type Offre = typeof offre.$inferSelect;
export type Candidature = typeof candidature.$inferSelect;
export type Cv = typeof cv.$inferSelect;
export type Test = typeof test.$inferSelect;
export type TestAttempt = typeof testAttempt.$inferSelect;
