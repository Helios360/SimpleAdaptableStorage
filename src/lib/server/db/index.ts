import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

type DB = PostgresJsDatabase<typeof schema>;

let _db: DB | null = null;
let _client: postgres.Sql | null = null;

function init(): DB {
  if (_db) return _db;
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
  _client = postgres(env.DATABASE_URL, { max: 20, idle_timeout: 20, prepare: false });
  _db = drizzle(_client, { schema });
  return _db;
}

/**
 * Lazy proxy — the postgres client is only created on first use.
 * This lets `vite build` import this module without needing DATABASE_URL set.
 */
export const db = new Proxy({} as DB, {
  get: (_t, prop) => Reflect.get(init() as object, prop)
});

export { schema };
