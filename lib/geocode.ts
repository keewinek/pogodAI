/** Wynik wyszukiwania / reverse geocoding (Open-Meteo Geocoding API). */
export interface GeocodePlace {
  name: string;
  lat: number;
  lon: number;
}

interface OpenMeteoPlace {
  name: string;
  latitude: number;
  longitude: number;
  admin1?: string;
  admin2?: string;
  country?: string;
  country_code?: string;
}

interface OpenMeteoResponse {
  results?: OpenMeteoPlace[];
}

const GEOCODE_BASE = "https://geocoding-api.open-meteo.com/v1";

/** Etykieta miejsca po polsku, np. „Białołęka, Warszawa” lub „Zakopane”. */
export function formatPlaceLabel(p: OpenMeteoPlace): string {
  const parts = [p.name];
  if (p.admin2 && p.admin2 !== p.name) parts.push(p.admin2);
  else if (p.admin1 && p.admin1 !== p.name) parts.push(p.admin1);
  if (p.country_code && p.country_code !== "PL" && p.country) {
    parts.push(p.country);
  }
  const label = parts.join(", ");
  return trimLabel(label);
}

function toPlace(p: OpenMeteoPlace): GeocodePlace {
  return {
    name: formatPlaceLabel(p),
    lat: p.latitude,
    lon: p.longitude,
  };
}

export async function searchPlaces(query: string): Promise<GeocodePlace[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const url = new URL(`${GEOCODE_BASE}/search`);
  url.searchParams.set("name", q);
  url.searchParams.set("count", "8");
  url.searchParams.set("language", "pl");
  url.searchParams.set("countryCode", "PL");
  url.searchParams.set("format", "json");

  const res = await fetch(url);
  if (!res.ok) throw new Error("Geocoding search failed");
  const data = (await res.json()) as OpenMeteoResponse;
  return (data.results ?? []).map(toPlace);
}

export async function reversePlace(
  lat: number,
  lon: number,
): Promise<GeocodePlace | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("format", "json");
  url.searchParams.set("accept-language", "pl");
  url.searchParams.set("zoom", "14");

  const res = await fetch(url, {
    headers: { "User-Agent": "PogodAI/1.0 (private weather app)" },
  });
  if (!res.ok) throw new Error("Reverse geocoding failed");

  const data = (await res.json()) as {
    address?: Record<string, string>;
    display_name?: string;
  };

  const name = data.address
    ? formatNominatimLabel(data.address)
    : data.display_name?.split(",").slice(0, 2).join(",").trim() ?? "";

  if (!name) return null;

  return { name: trimLabel(name), lat, lon };
}

function formatNominatimLabel(addr: Record<string, string>): string {
  const locality = addr.city || addr.town || addr.village ||
    addr.municipality ||
    addr.county;
  const district = addr.suburb || addr.city_district || addr.neighbourhood ||
    addr.quarter;
  const parts: string[] = [];
  if (district && district !== locality) parts.push(district);
  if (locality) parts.push(locality);
  if (addr.country_code && addr.country_code !== "pl" && addr.country) {
    parts.push(addr.country);
  }
  if (parts.length === 0 && addr.state) parts.push(addr.state);
  return trimLabel(parts.join(", ") || "Nieznana lokalizacja");
}

function trimLabel(label: string): string {
  if (label.length <= 60) return label;
  return label.slice(0, 57) + "…";
}
