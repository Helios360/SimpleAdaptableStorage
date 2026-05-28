/** Resolves a French city name to (lon, lat) via geo.api.gouv.fr. Returns null on failure. */
export async function getCityCoords(city: string): Promise<[number, number] | null> {
  if (!city) return null;
  const url = `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(
    city
  )}&boost=population&fields=centre&limit=1`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const data = await res.json();
    const coords = data?.[0]?.centre?.coordinates;
    if (!Array.isArray(coords) || coords.length !== 2) return null;
    return [Number(coords[0]), Number(coords[1])];
  } catch {
    return null;
  }
}
