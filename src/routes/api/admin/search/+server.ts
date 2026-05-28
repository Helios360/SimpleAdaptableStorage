import { json } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import { requireAdmin } from '$server/guards';
import { db } from '$server/db';
import { getCityCoords } from '$server/geocode';
import type { RequestHandler } from './$types';

type Body = {
  q?: string;
  city?: string;
  postal?: string;
  radius?: number | null;
  permis?: boolean;
  vehicule?: boolean;
  mobile?: boolean;
  tags?: string[];
  skills?: string[];
  status?: string[];
  year?: number[];
  formation_id?: number[];
  age?: number | null;
  trancheAge?: string;
  order?: 'name' | 'fname' | 'city' | 'status' | 'created_at' | 'gen_score';
  orderBy?: 'ASC' | 'DESC';
  page?: number;
  pageSize?: number;
};

const ALLOWED_STATUSES = new Set(['active', 'recherche', 'entreprise', 'archive']);
const ORDER_COLS: Record<string, string> = {
  name: 'p.name',
  fname: 'p.fname',
  city: 'p.city',
  status: 'p.status',
  created_at: 'p.created_at',
  gen_score: 'ta.gen_score'
};

export const POST: RequestHandler = async (event) => {
  const admin = requireAdmin(event);
  const b = (await event.request.json().catch(() => ({}))) as Body;

  const page = Math.max(1, Number(b.page ?? 1) | 0);
  const pageSize = Math.min(100, Math.max(1, Number(b.pageSize ?? 20) | 0));
  const offset = (page - 1) * pageSize;

  const qStr = (b.q ?? '').trim();
  const postal = (b.postal ?? '').trim();
  let city = (b.city ?? '').trim();
  const radius = Number.isFinite(Number(b.radius)) ? Number(b.radius) : null;

  const tags = Array.isArray(b.tags) ? b.tags.filter(Boolean).map(String) : [];
  const skills = Array.isArray(b.skills) ? b.skills.filter(Boolean).map(String) : [];
  const statusFilters = (Array.isArray(b.status) ? b.status : [])
    .map((s) => String(s ?? '').trim())
    .filter((s) => ALLOWED_STATUSES.has(s));
  const yearFilters = (Array.isArray(b.year) ? b.year : []).map(Number).filter(Number.isFinite);
  const formationFilters = (Array.isArray(b.formation_id) ? b.formation_id : [])
    .map(Number)
    .filter(Number.isFinite);

  const orderKey = b.order ?? 'gen_score';
  const orderCol = ORDER_COLS[orderKey] || 'ta.gen_score';
  const orderDir = (b.orderBy ?? 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const where: any[] = [
    // admin only sees candidates from formations they manage
    sql`EXISTS (SELECT 1 FROM staff_settings ss WHERE ss.staff_user_id = ${admin.id} AND ss.formation_id = p.formation_id)`
  ];

  if (qStr) {
    const like = `%${qStr}%`;
    where.push(
      sql`(p.name ILIKE ${like} OR p.fname ILIKE ${like} OR (p.fname || ' ' || p.name) ILIKE ${like} OR (p.name || ' ' || p.fname) ILIKE ${like})`
    );
  }

  // Geographical filter — if radius is given and we can geocode, use a great-circle approx.
  if (city && radius !== null) {
    const coords = await getCityCoords(city);
    if (coords) {
      const [lon, lat] = coords;
      where.push(
        sql`p.lon IS NOT NULL AND p.lat IS NOT NULL AND (6371 * acos(
          cos(radians(${lat})) * cos(radians(p.lat::float8)) * cos(radians(p.lon::float8) - radians(${lon}))
          + sin(radians(${lat})) * sin(radians(p.lat::float8))
        )) <= ${radius}`
      );
      city = '';
    }
  }
  if (city) where.push(sql`p.city ILIKE ${'%' + city + '%'}`);
  if (postal) where.push(sql`p.postal ILIKE ${'%' + postal + '%'}`);

  if (b.permis) where.push(sql`p.permis = true`);
  if (b.vehicule) where.push(sql`p.vehicule = true`);
  if (b.mobile) where.push(sql`p.mobile = true`);

  if (Number.isFinite(Number(b.age))) {
    where.push(sql`date_part('year', age(p.birth)) = ${Number(b.age)}`);
  } else if (b.trancheAge && /^\d+-\d+$/.test(b.trancheAge)) {
    const [minA, maxA] = b.trancheAge.split('-').map(Number);
    where.push(sql`date_part('year', age(p.birth)) BETWEEN ${minA} AND ${maxA}`);
  }

  if (statusFilters.length) where.push(sql`p.status = ANY(${statusFilters}::text[])`);
  if (yearFilters.length) where.push(sql`p.year = ANY(${yearFilters}::int[])`);
  if (formationFilters.length) where.push(sql`p.formation_id = ANY(${formationFilters}::int[])`);

  for (const t of tags) where.push(sql`p.tags @> ${JSON.stringify([t])}::jsonb`);
  for (const s of skills) where.push(sql`p.skills @> ${JSON.stringify([s])}::jsonb`);

  const whereSql = where.length
    ? sql.join([sql`WHERE`, sql.join(where, sql` AND `)], sql` `)
    : sql``;

  const countRows = await db.execute<{ total: string }>(
    sql`SELECT COUNT(*)::int AS total FROM user_profiles p ${whereSql}`
  );
  const total = Number(countRows[0]?.total ?? 0);

  const rows = await db.execute(
    sql`
      SELECT
        p.user_id AS id, u.email, p.name, p.fname, p.city, p.permis, p.mobile, p.vehicule,
        p.postal, p.lon, p.lat, p.created_at, p.birth, p.status, p.tags, p.skills,
        f.code AS formation_code, f.name AS formation_name,
        ta.gen_score
      FROM user_profiles p
      JOIN "user" u ON u.id = p.user_id
      LEFT JOIN formations f ON f.id = p.formation_id
      LEFT JOIN (
        SELECT user_id, ROUND(AVG(score))::int AS gen_score
        FROM test_attempts GROUP BY user_id
      ) ta ON ta.user_id = p.user_id
      ${whereSql}
      ORDER BY ${sql.raw(orderCol)} ${sql.raw(orderDir)} NULLS LAST, p.user_id ASC
      LIMIT ${pageSize} OFFSET ${offset}
    `
  );

  return json({
    success: true,
    users: rows,
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
  });
};
