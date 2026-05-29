import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

type DBInstance = PostgresJsDatabase<typeof schema>;

let _db: DBInstance | null = null;
function instance(): DBInstance {
	if (_db) return _db;
	if (!env.DATABASE_URL) throw new Error('DATABASE_URL is required');
	const client = postgres(env.DATABASE_URL, { max: 10 });
	_db = drizzle(client, { schema });
	return _db;
}

export const db: DBInstance = new Proxy({} as DBInstance, {
	get(_, prop) {
		const target = instance();
		const value = Reflect.get(target, prop);
		return typeof value === 'function' ? value.bind(target) : value;
	}
});

export type DB = DBInstance;
