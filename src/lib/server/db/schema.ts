import {
  pgTable,
  serial,
  integer,
  bigserial,
  varchar,
  text,
  boolean,
  timestamp,
  date,
  numeric,
  jsonb,
  pgEnum,
  primaryKey,
  index,
  uniqueIndex
} from 'drizzle-orm/pg-core';

// === Domain ===

export const statusEnum = pgEnum('user_status', [
  'active',
  'recherche',
  'entreprise',
  'archive'
]);

export const formations = pgTable('formations', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull()
});

/**
 * BetterAuth manages identity (id/email/password). `userProfiles` carries
 * the domain data — keyed 1-1 to the auth user by `userId`.
 */
export const userProfiles = pgTable(
  'user_profiles',
  {
    userId: text('user_id').primaryKey(),
    name: varchar('name', { length: 64 }).notNull(),
    fname: varchar('fname', { length: 64 }).notNull(),
    tel: varchar('tel', { length: 32 }).notNull().default(''),
    addr: text('addr'),
    city: varchar('city', { length: 64 }).notNull().default(''),
    lon: numeric('lon', { precision: 10, scale: 7 }),
    lat: numeric('lat', { precision: 10, scale: 7 }),
    postal: varchar('postal', { length: 16 }),
    birth: date('birth'),
    cv: varchar('cv', { length: 254 }),
    idDoc: varchar('id_doc', { length: 254 }),
    idDocVerso: varchar('id_doc_verso', { length: 254 }),
    video: varchar('video', { length: 254 }),
    titreValide: date('titre_valide'),
    tags: jsonb('tags').$type<string[]>().notNull().default([]),
    skills: jsonb('skills').$type<string[]>().notNull().default([]),
    permis: boolean('permis').notNull().default(false),
    vehicule: boolean('vehicule').notNull().default(false),
    mobile: boolean('mobile').notNull().default(false),
    consent: boolean('consent').notNull().default(false),
    consentedAt: timestamp('consented_at', { withTimezone: true }),
    termsVersion: integer('terms_version').notNull().default(1),
    status: statusEnum('status').notNull().default('recherche'),
    formationId: integer('formation_id').references(() => formations.id, {
      onDelete: 'restrict'
    }),
    year: integer('year'),
    isAdmin: boolean('is_admin').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => ({
    formationIdx: index('user_profiles_formation_idx').on(t.formationId),
    statusIdx: index('user_profiles_status_idx').on(t.status)
  })
);

export const staffSettings = pgTable(
  'staff_settings',
  {
    staffUserId: text('staff_user_id').notNull(),
    formationId: integer('formation_id')
      .notNull()
      .references(() => formations.id, { onDelete: 'cascade' })
  },
  (t) => ({
    pk: primaryKey({ columns: [t.staffUserId, t.formationId] })
  })
);

export const tests = pgTable('tests', {
  id: serial('id').primaryKey(),
  question: varchar('question', { length: 200 }).notNull(),
  answer: varchar('answer', { length: 1000 }).notNull(),
  /** 1=frontend, 2=backend, 3=psychotechnical */
  type: integer('type').notNull(),
  /** 1=easy, 2=medium, 3=hard */
  difficulty: integer('difficulty').notNull()
});

export const testAttempts = pgTable(
  'test_attempts',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    userId: text('user_id').notNull(),
    testId: integer('test_id')
      .notNull()
      .references(() => tests.id, { onDelete: 'cascade' }),
    response: text('response'),
    score: integer('score'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => ({
    userIdx: index('test_attempts_user_idx').on(t.userId),
    testIdx: index('test_attempts_test_idx').on(t.testId),
    userTestCreatedIdx: index('test_attempts_user_test_created_idx').on(
      t.userId,
      t.testId,
      t.createdAt
    )
  })
);

// === BetterAuth core tables (kept compatible with default adapter) ===

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => ({
    userIdx: index('session_user_idx').on(t.userId)
  })
);

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
    scope: text('scope'),
    idToken: text('id_token'),
    password: text('password'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => ({
    provider: uniqueIndex('account_provider_account_idx').on(t.providerId, t.accountId)
  })
);

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export type Formation = typeof formations.$inferSelect;
export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;
export type Test = typeof tests.$inferSelect;
export type TestAttempt = typeof testAttempts.$inferSelect;
