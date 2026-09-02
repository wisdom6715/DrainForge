// Free forward/reverse geocoding via OpenStreetMap's Nominatim service.
// No API key needed. Nominatim's usage policy asks for reasonable request
// volume (roughly 1 req/sec) and attribution, which is fine for a pilot —
// for higher production traffic, swap this for a paid provider (Mapbox,
// LocationIQ, Google) using the same two function signatures.

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

// Soft bias toward Lagos, Nigeria (bounded=0 means it still returns results
// outside this box, just ranks nearby ones higher).
const LAGOS_VIEWBOX = "2.5,6.8,4.5,6.3";

export interface PlaceSuggestion {
  displayName: string;
  latitude: number;
  longitude: number;
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];
  const params = new URLSearchParams({
    format: "jsonv2",
    q: trimmed,
    addressdetails: "0",
    limit: "5",
    viewbox: LAGOS_VIEWBOX,
    bounded: "0",
  });
  const response = await fetch(`${NOMINATIM_BASE}/search?${params.toString()}`, { signal });
  if (!response.ok) throw new Error("Location search failed");
  const results: { display_name: string; lat: string; lon: string }[] = await response.json();
  return results.map((item) => ({
    displayName: item.display_name,
    latitude: parseFloat(item.lat),
    longitude: parseFloat(item.lon),
  }));
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<string> {
  const params = new URLSearchParams({
    format: "jsonv2",
    lat: String(latitude),
    lon: String(longitude),
  });
  const response = await fetch(`${NOMINATIM_BASE}/reverse?${params.toString()}`);
  if (!response.ok) throw new Error("Reverse geocoding failed");
  const result: { display_name?: string } = await response.json();
  return result.display_name ?? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}
