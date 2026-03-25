import { pgTable, serial, varchar, text, integer, boolean, date, timestamp, numeric, jsonb, pgEnum, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { formations } from './additions.schema';

// ========== ENUMS ==========
export const userStatusEnum = pgEnum('user_status', [
	'active',
	'recherche',
	'entreprise',
	'archive'
]);

// ========== USERS (business data) ==========
export const users = pgTable(
	'users',
	{
		id: serial('id').primaryKey(),

		lastName: varchar('last_name', { length: 64 }).notNull(),
		firstName: varchar('first_name', { length: 64 }).notNull(),

		email: varchar('email', { length: 255 }).notNull(),

		tel: varchar('tel', { length: 32 }).notNull(),
		addr: text('addr'),
		city: varchar('city', { length: 64 }).notNull(),
		postal: varchar('postal', { length: 16 }),

		lon: numeric('lon', { precision: 10, scale: 7 }),
		lat: numeric('lat', { precision: 10, scale: 7 }),

		birth: date('birth').notNull(),

		cv: varchar('cv', { length: 254 }),
		idDoc: varchar('id_doc', { length: 254 }),
		idDocVerso: varchar('id_doc_verso', { length: 254 }),
		titreValide: date('titre_valide'),

		tags: jsonb('tags').$type<string[] | null>(),
		skills: jsonb('skills').$type<string[] | null>(),

		permis: boolean('permis').notNull().default(false),
		vehicule: boolean('vehicule').notNull().default(false),
		mobile: boolean('mobile').notNull().default(false),

		consent: boolean('consent').notNull().default(false),
		consentedAt: timestamp('consented_at', { mode: 'date' }),
		termsVersion: integer('terms_version').notNull().default(1),

		status: userStatusEnum('status').notNull().default('recherche'),

		formationId: integer('formation_id')
			.notNull()
			.references(() => formations.id, { onDelete: 'restrict' }),

		isAdmin: boolean('is_admin').notNull().default(false),

		createdAt: timestamp('created_at', { mode: 'date' })
			.notNull()
			.defaultNow(),

		updatedAt: timestamp('updated_at', { mode: 'date' })
			.notNull()
			.defaultNow()
	},
	(table) => ({
		emailUnique: uniqueIndex('users_email_unique').on(table.email),
		formationIdx: index('users_formation_id_idx').on(table.formationId)
	})
);

// ========== USERS (auth/creds/tokens) ==========
export const userAuth = pgTable(
	'user_auth',
	{
		userId: integer('user_id')
			.primaryKey()
			.references(() => users.id, { onDelete: 'cascade' }),

		passwordHash: varchar('password_hash', { length: 255 }).notNull(),

		emailVerifiedAt: timestamp('email_verified_at', { mode: 'date' }),

		emailVerifyToken: varchar('email_verify_token', { length: 254 }),
		emailVerifyExpires: timestamp('email_verify_expires', { mode: 'date' }),

		resetPasswordToken: varchar('reset_password_token', { length: 64 }),
		resetPasswordExpires: timestamp('reset_password_expires', { mode: 'date' }),

		lastLoginAt: timestamp('last_login_at', { mode: 'date' }),
		failedLoginCount: integer('failed_login_count').notNull().default(0),
		lockedUntil: timestamp('locked_until', { mode: 'date' }),

		createdAt: timestamp('created_at', { mode: 'date' })
			.notNull()
			.defaultNow(),

		updatedAt: timestamp('updated_at', { mode: 'date' })
			.notNull()
			.defaultNow()
	},
	(table) => ({
		emailVerifyTokenUnique: uniqueIndex('user_auth_email_verify_token_unique').on(
			table.emailVerifyToken
		),
		resetPasswordTokenUnique: uniqueIndex('user_auth_reset_password_token_unique').on(
			table.resetPasswordToken
		)
	})
);

