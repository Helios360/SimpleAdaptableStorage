import { json } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db';

export const GET = async () => {
	try {
		await db.execute(sql`select 1`);
		return json({ status: 'ok', db: 'ok' });
	} catch (err) {
		return json(
			{ status: 'error', db: 'down', error: err instanceof Error ? err.message : 'unknown' },
			{ status: 503 }
		);
	}
};
