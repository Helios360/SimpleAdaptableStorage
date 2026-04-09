import {
	mysqlTable,
	int,
	tinyint,
	varchar,
	text,
	bigint,
	timestamp,
	index
} from 'drizzle-orm/mysql-core';
import { users } from './user.schema';

export const tests = mysqlTable('Tests', {
	id: int('id').autoincrement().primaryKey(),
	question: varchar('question', { length: 200 }).notNull(),
	answer: varchar('answer', { length: 1000 }).notNull(),
	type: tinyint('type').notNull(),
	difficulty: tinyint('difficulty').notNull()
});

export const testAttempts = mysqlTable(
	'TestAttempts',
	{
		id: bigint('id', { mode: 'number' }).autoincrement().primaryKey(),
		userId: int('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		testId: int('test_id')
			.notNull()
			.references(() => tests.id, { onDelete: 'cascade' }),
		response: text('response'),
		score: int('score'),
		creation: timestamp('creation', { mode: 'date' }).notNull().defaultNow()
	},
	(table) => ({
		userIdx: index('TestAttempts_user_id_idx').on(table.userId),
		testIdx: index('TestAttempts_test_id_idx').on(table.testId),
		userTestCreationIdx: index('TestAttempts_user_test_creation_idx').on(
			table.userId,
			table.testId,
			table.creation
		)
	})
);