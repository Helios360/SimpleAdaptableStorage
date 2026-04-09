import { int, mysqlTable, primaryKey, index } from 'drizzle-orm/mysql-core';

import { users } from './user.schema';
import { formations } from './additions.schema';

export const staffSettings = mysqlTable(
	'StaffSettings',
	{
		staffUserId: int('staff_user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		formationId: int('formation_id')
			.notNull()
			.references(() => formations.id, { onDelete: 'cascade' })
	},
	(table) => ({
		pk: primaryKey({ columns: [table.staffUserId, table.formationId] }),
		formationIdx: index('staff_settings_formation_id_idx').on(table.formationId)
	})
);
