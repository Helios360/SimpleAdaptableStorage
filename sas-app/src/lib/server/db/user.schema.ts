import {
	mysqlTable,
	int,
	varchar,
	text,
	decimal,
	date,
	timestamp,
	datetime,
	json,
	boolean,
	mysqlEnum,
	index,
	uniqueIndex
} from 'drizzle-orm/mysql-core';
import { formations } from './additions.schema';

export const userStatusEnum = mysqlEnum('status', [
	'active',
	'recherche',
	'entreprise',
	'archive'
]);

export const users = mysqlTable(
	'Users',
	{
		id: int('id').autoincrement().primaryKey(),

		name: varchar('name', { length: 64 }).notNull(),		// last name
		fname: varchar('fname', { length: 64 }).notNull(),		// first name

		email: varchar('email', { length: 255 }).notNull(),
		tel: varchar('tel', { length: 32 }).notNull(),

		addr: text('addr'),
		city: varchar('city', { length: 64 }).notNull(),
		lon: decimal('lon', { precision: 10, scale: 7 }),
		lat: decimal('lat', { precision: 10, scale: 7 }),
		postal: varchar('postal', { length: 16 }),

		birth: date('birth').notNull(),

		cv: varchar('cv', { length: 254 }),
		idDoc: varchar('id_doc', { length: 254 }),			// recto
		idDocVerso: varchar('id_doc_verso', { length: 254 }),	// verso
		titreValide: date('titre_valide'),

		password: varchar('password', { length: 255 }).notNull(),

		tags: json('tags').$type<string[] | null>(),
		skills: json('skills').$type<string[] | null>(),

		permis: boolean('permis').notNull().default(false),
		vehicule: boolean('vehicule').notNull().default(false),
		mobile: boolean('mobile').notNull().default(false),

		createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { mode: 'date' })
			.notNull()
			.defaultNow()
			.onUpdateNow(),

		consent: boolean('consent').notNull().default(false),
		consentedAt: datetime('consented_at', { mode: 'date' }),
		termsVersion: int('terms_version').notNull().default(1),

		status: userStatusEnum.notNull().default('recherche'),

		formationId: int('formation_id')
			.notNull()
			.references(() => formations.id, { onDelete: 'restrict' }),

		emailVerified: boolean('email_verified').notNull().default(false),
		emailVerifyToken: varchar('email_verify_token', { length: 254 }),
		emailVerifyExpires: datetime('email_verify_expires', { mode: 'date' }),
		emailVerifiedAt: datetime('email_verified_at', { mode: 'date' }),

		resetPwdToken: varchar('reset_pwd_token', { length: 64 }),
		resetPwdExpires: datetime('reset_pwd_expires', { mode: 'date' }),

		isAdmin: boolean('is_admin').notNull().default(false)
	},
	(table) => ({
		emailUnique: uniqueIndex('Users_email_unique').on(table.email),
		formationIdx: index('Users_formation_id_idx').on(table.formationId)
	})
);

