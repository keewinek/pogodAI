import { slugify } from "./slug.ts";
import type { Forecast, HealthStatus, Location } from "./types.ts";
import { isLocation } from "./validate.ts";

const LOCATIONS_KEY = ["locations"] as const;

const DEFAULT_LOCATION: Location = {
  id: "warszawa-bialoleka",
  name: "Białołęka, Warszawa",
  lat: 52.32,
  lon: 20.97,
  createdAt: "2026-07-05T00:00:00.000Z",
};

let kvPromise: Promise<Deno.Kv> | null = null;

export function getKv(): Promise<Deno.Kv> {
  if (!kvPromise) {
    kvPromise = Deno.openKv();
  }
  return kvPromise;
}

async function readLocations(kv: Deno.Kv): Promise<Location[]> {
  const entry = await kv.get<Location[]>(LOCATIONS_KEY);
  const locations = entry.value ?? [];
  return locations.filter(isLocation);
}

async function ensureSeeded(kv: Deno.Kv): Promise<Location[]> {
  const locations = await readLocations(kv);
  if (locations.length > 0) return locations;

  await kv.set(LOCATIONS_KEY, [DEFAULT_LOCATION]);
  return [DEFAULT_LOCATION];
}

export async function listLocations(): Promise<Location[]> {
  const kv = await getKv();
  return await ensureSeeded(kv);
}

export async function getLocation(id: string): Promise<Location | null> {
  const locations = await listLocations();
  return locations.find((location) => location.id === id) ?? null;
}

export async function addLocation(
  name: string,
  lat: number,
  lon: number,
): Promise<
  { ok: true; location: Location } | {
    ok: false;
    error: string;
    status: 400 | 409;
  }
> {
  const id = slugify(name);
  if (!id) {
    return {
      ok: false,
      error: "Nie udało się wygenerować identyfikatora lokalizacji",
      status: 400,
    };
  }

  const kv = await getKv();
  const locations = await ensureSeeded(kv);

  if (locations.some((location) => location.id === id)) {
    return {
      ok: false,
      error: "Lokalizacja o tym identyfikatorze już istnieje",
      status: 409,
    };
  }

  const location: Location = {
    id,
    name,
    lat,
    lon,
    createdAt: new Date().toISOString(),
  };

  await kv.set(LOCATIONS_KEY, [...locations, location]);
  return { ok: true, location };
}

export async function deleteLocation(id: string): Promise<boolean> {
  const kv = await getKv();
  const locations = await ensureSeeded(kv);
  const index = locations.findIndex((location) => location.id === id);
  if (index === -1) return false;

  const nextLocations = locations.filter((location) => location.id !== id);
  const atomic = kv.atomic()
    .set(LOCATIONS_KEY, nextLocations)
    .delete(["forecast", id]);
  await atomic.commit();
  return true;
}

export async function getForecast(
  locationId: string,
): Promise<Forecast | null> {
  const kv = await getKv();
  const entry = await kv.get<Forecast>(["forecast", locationId]);
  return entry.value ?? null;
}

export async function setForecast(forecast: Forecast): Promise<void> {
  const kv = await getKv();
  await kv.set(["forecast", forecast.locationId], forecast);
}

export async function getHealthStatus(): Promise<HealthStatus> {
  const kv = await getKv();
  const locations = await ensureSeeded(kv);

  let forecasts = 0;
  let newestForecastAt: string | null = null;

  for (const location of locations) {
    const entry = await kv.get<Forecast>(["forecast", location.id]);
    if (!entry.value) continue;

    forecasts += 1;
    if (!newestForecastAt || entry.value.generatedAt > newestForecastAt) {
      newestForecastAt = entry.value.generatedAt;
    }
  }

  return {
    ok: true,
    locations: locations.length,
    forecasts,
    newestForecastAt,
  };
}
