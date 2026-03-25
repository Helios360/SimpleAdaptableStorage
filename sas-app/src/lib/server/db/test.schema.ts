import { pgTable, serial, bigserial, varchar, text, integer, boolean, date, timestamp, numeric, jsonb, primaryKey, pgEnum, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './user.schema';

// ========== TESTS ==========
export const tests = pgTable('tests', {
	id: serial('id').primaryKey(),
	question: varchar('question', { length: 200 }).notNull(),
	answer: varchar('answer', { length: 1000 }).notNull(),
	type: integer('type').notNull(),
	difficulty: integer('difficulty').notNull()
});

// ========== STUDENTS TESTS HISTORY ==========
export const testAttempts = pgTable(
	'test_attempts',
	{
		id: bigserial('id', { mode: 'number' }).primaryKey(),
		userId: integer('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),

		testId: integer('test_id')
			.notNull()
			.references(() => tests.id, { onDelete: 'cascade' }),

		response: text('response'),
		score: integer('score'),
		creation: timestamp('creation', { mode: 'date' })
			.notNull()
			.defaultNow()
	},
	(table) => ({
		userIdx: index('test_attempts_user_id_idx').on(table.userId),
		testIdx: index('test_attempts_test_id_idx').on(table.testId),
		userTestCreationIdx: index('test_attempts_user_test_creation_idx').on(
			table.userId,
			table.testId,
			table.creation
		)
	})
);