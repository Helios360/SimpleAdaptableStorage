import { int, mysqlTable, varchar } from 'drizzle-orm/mysql-core';

export const formations = mysqlTable('Formations', {
	id: int('id').autoincrement().primaryKey(),
	code: varchar('code', { length: 50 }).notNull().unique(),
	name: varchar('name', { length: 100 }).notNull()
});
