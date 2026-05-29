/**
 * Géocodage via api-adresse.data.gouv.fr (BAN). Gratuit, sans clé, France.
 * Doc : https://adresse.data.gouv.fr/api-doc/adresse
 */
const ENDPOINT = 'https://api-adresse.data.gouv.fr/search/';

export interface GeoPoint {
	lat: number;
	lon: number;
	label?: string;
	postal?: string;
	city?: string;
}

const cache = new Map<string, GeoPoint | null>();

export async function geocode(query: string, postal?: string): Promise<GeoPoint | null> {
	const q = query.trim();
	if (!q) return null;
	const key = `${q.toLowerCase()}|${postal ?? ''}`;
	if (cache.has(key)) return cache.get(key)!;

	const params = new URLSearchParams({ q, limit: '1', autocomplete: '0' });
	if (postal && /^\d{5}$/.test(postal)) params.set('postcode', postal);

	try {
		const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
			headers: { Accept: 'application/json' }
		});
		if (!res.ok) {
			cache.set(key, null);
			return null;
		}
		const data = (await res.json()) as {
			features?: Array<{
				geometry: { coordinates: [number, number] };
				properties: { label?: string; postcode?: string; city?: string };
			}>;
		};
		const f = data.features?.[0];
		if (!f) {
			cache.set(key, null);
			return null;
		}
		const [lon, lat] = f.geometry.coordinates;
		const point: GeoPoint = {
			lat,
			lon,
			label: f.properties.label,
			postal: f.properties.postcode,
			city: f.properties.city
		};
		cache.set(key, point);
		return point;
	} catch {
		cache.set(key, null);
		return null;
	}
}
