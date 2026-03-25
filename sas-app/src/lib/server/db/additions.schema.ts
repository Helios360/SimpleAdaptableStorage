import { pgTable, serial, varchar, integer, primaryKey, index } from 'drizzle-orm/pg-core';
import { users } from './user.schema';

// ========== ENUMS ==========
export const formations = pgTable('formations', {
	id: serial('id').primaryKey(),
	code: varchar('code', { length: 50 }).notNull().unique(),
	name: varchar('name', { length: 100 }).notNull()
});

// ========== STAFF SETTINGS ==========
export const staffSettings = pgTable(
	'staff_settings',
	{
		staffUserId: integer('staff_user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),

		formationId: integer('formation_id')
			.notNull()
			.references(() => formations.id, { onDelete: 'cascade' })
	},
	(table) => ({
		pk: primaryKey({
			columns: [table.staffUserId, table.formationId]
		}),
		formationIdx: index('staff_settings_formation_id_idx').on(table.formationId)
	})
);

// ========== SKILLS AND TAGS ==========
