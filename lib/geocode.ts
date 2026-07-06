export interface PlaceResult {
  name: string;
  lat: number;
  lon: number;
}

interface OpenMeteoHit {
  name: string;
  latitude: number;
  longitude: number;
  population?: number;
  admin1?: string;
  admin2?: string;
  admin3?: string;
}

const MAJOR_CITIES = new Set([
  "Warszawa",
  "Kraków",
  "Łódź",
  "Wrocław",
  "Poznań",
  "Gdańsk",
  "Szczecin",
  "Bydgoszcz",
  "Lublin",
  "Katowice",
]);

const NOMINATIM = "https://nominatim.openstreetmap.org";
const USER_AGENT = "PogodAI/1.0 (https://pogodai.keewinek.deno.net)";

function shortVoivodeship(admin1: string): string {
  const s = admin1.replace(/^województwo\s+/i, "").trim();
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatOpenMeteoPlace(hit: OpenMeteoHit): string {
  // Dzielnica w większym mieście (np. Białołęka, Warszawa)
  if (
    hit.admin2 && hit.name !== hit.admin2 &&
    hit.admin3 === hit.admin2
  ) {
    return `${hit.name}, ${hit.admin2}`;
  }

  // Mniejsza miejscowość — dołącz województwo
  if (
    hit.admin1 &&
    (hit.population ?? 0) < 100_000 &&
    !MAJOR_CITIES.has(hit.name) &&
    (hit.name === hit.admin3 || hit.name === hit.admin2)
  ) {
    return `${hit.name}, ${shortVoivodeship(hit.admin1)}`;
  }

  return hit.name;
}

function formatNominatimAddress(
  address: Record<string, string>,
): string | null {
  const district = address.suburb || address.city_district ||
    address.quarter;
  const city = address.city || address.town || address.village;
  const state = address.state ? shortVoivodeship(address.state) : "";

  if (district && city && district !== city) {
    return `${district}, ${city}`;
  }

  if (city) {
    if (MAJOR_CITIES.has(city)) return city;
    if (state && state !== city) return `${city}, ${state}`;
    return city;
  }

  return null;
}

export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", q);
  url.searchParams.set("count", "6");
  url.searchParams.set("language", "pl");
  url.searchParams.set("country_code", "PL");

  const res = await fetch(url);
  if (!res.ok) throw new Error("Geocoding search failed");

  const data = await res.json() as { results?: OpenMeteoHit[] };
  if (!data.results?.length) return [];

  return data.results.map((hit) => ({
    name: formatOpenMeteoPlace(hit),
    lat: hit.latitude,
    lon: hit.longitude,
  }));
}

export async function reversePlace(
  lat: number,
  lon: number,
): Promise<PlaceResult | null> {
  const url = new URL(`${NOMINATIM}/reverse`);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "pl");

  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error("Reverse geocoding failed");

  const data = await res.json() as { address?: Record<string, string> };
  if (!data.address) return null;

  const name = formatNominatimAddress(data.address);
  if (!name) return null;

  return { name, lat, lon };
}
