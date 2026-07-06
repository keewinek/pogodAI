import type {
  AccuracyStats,
  PendingVerification,
  VerifiedPair,
} from "./verification.ts";
import {
  bucketAccuracyFromSums,
  emptyAccuracyStats,
  LEAD_BUCKETS,
  MAX_VERIFIED_HISTORY,
  normalizeAccuracyStats,
  overallAccuracyFromBuckets,
  sampleArchiveHours,
} from "./verification.ts";

export interface Location {
  id: string;
  name: string;
  lat: number;
  lon: number;
  createdAt: string;
}

export interface HourForecast {
  time: string;
  emoji: string;
  temperature: number;
  precipitationChance: number;
  windKmh: number;
}

export interface DayForecast {
  date: string;
  tempMin: number;
  tempMax: number;
  precipitationChance: number;
  windKmh: number;
  hours: HourForecast[];
}

export interface Verdict {
  text: string;
  emoji: string;
  temperature: number;
  feelsLike: number;
  precipitationChance: number;
  windKmh: number;
}

export interface Forecast {
  locationId: string;
  generatedAt: string;
  sources: string[];
  verdict: Verdict;
  days: DayForecast[];
}

const LOCATIONS_KEY = ["locations"];
const FORECAST_KEY = "forecast";
const VERIFY_PENDING_KEY = "verify-pending";
const VERIFY_DONE_KEY = "verify-done";
const ACCURACY_STATS_KEY = "accuracy-stats";
export const GLOBAL_ACCURACY_ID = "global";

export const DEFAULT_LOCATION: Location = {
  id: "warszawa-bialoleka",
  name: "Białołęka, Warszawa",
  lat: 52.32,
  lon: 20.97,
  createdAt: "2026-07-05T00:00:00.000Z",
};

let kvPromise: Promise<Deno.Kv> | null = null;

export function getKv(): Promise<Deno.Kv> {
  if (!kvPromise) {
    kvPromise = Deno.openKv().then(async (kv) => {
      const existing = await kv.get<Location[]>(LOCATIONS_KEY);
      if (existing.value === null) {
        await kv.atomic()
          .check({ key: LOCATIONS_KEY, versionstamp: null })
          .set(LOCATIONS_KEY, [DEFAULT_LOCATION])
          .commit();
      }
      return kv;
    });
  }
  return kvPromise;
}

function coordsNear(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.02;
}

function dedupeLocations(locations: Location[]): Location[] {
  const kept: Location[] = [];
  for (const loc of locations) {
    if (
      !kept.some((k) =>
        coordsNear(k.lat, loc.lat) && coordsNear(k.lon, loc.lon)
      )
    ) {
      kept.push(loc);
    }
  }
  return kept;
}

async function deleteVerifyDataForLocation(
  kv: Deno.Kv,
  id: string,
): Promise<void> {
  for await (const entry of kv.list({ prefix: [VERIFY_PENDING_KEY, id] })) {
    await kv.delete(entry.key);
  }
  for await (const entry of kv.list({ prefix: [VERIFY_DONE_KEY, id] })) {
    await kv.delete(entry.key);
  }
  await kv.delete([ACCURACY_STATS_KEY, id]);
}

export async function listLocations(): Promise<Location[]> {
  const kv = await getKv();
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await kv.get<Location[]>(LOCATIONS_KEY);
    const locations = res.value ?? [];
    const deduped = dedupeLocations(locations);
    if (deduped.length === locations.length) return deduped;

    const removedIds = locations
      .filter((l) => !deduped.some((d) => d.id === l.id))
      .map((l) => l.id);
    const atomic = kv.atomic().check(res).set(LOCATIONS_KEY, deduped);
    for (const id of removedIds) {
      atomic.delete([FORECAST_KEY, id]);
    }
    const commit = await atomic.commit();
    if (!commit.ok) continue;

    for (const id of removedIds) {
      await deleteVerifyDataForLocation(kv, id);
    }
    return deduped;
  }
  const res = await kv.get<Location[]>(LOCATIONS_KEY);
  return dedupeLocations(res.value ?? []);
}

export async function getLocation(id: string): Promise<Location | null> {
  const locations = await listLocations();
  return locations.find((l) => l.id === id) ?? null;
}

export type AddLocationResult =
  | { ok: true; location: Location }
  | { ok: false; status: 409; error: string };

export async function addLocation(
  location: Location,
): Promise<AddLocationResult> {
  const kv = await getKv();
  // Pętla optimistic-concurrency na wypadek równoległych zapisów.
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await kv.get<Location[]>(LOCATIONS_KEY);
    const locations = res.value ?? [];
    if (locations.some((l) => l.id === location.id)) {
      return {
        ok: false,
        status: 409,
        error: "Lokalizacja o tym id już istnieje.",
      };
    }
    if (
      locations.some((l) =>
        coordsNear(l.lat, location.lat) && coordsNear(l.lon, location.lon)
      )
    ) {
      return {
        ok: false,
        status: 409,
        error: "Lokalizacja w tym miejscu już istnieje.",
      };
    }
    const commit = await kv.atomic()
      .check(res)
      .set(LOCATIONS_KEY, [...locations, location])
      .commit();
    if (commit.ok) return { ok: true, location };
  }
  throw new Error("Nie udało się zapisać lokalizacji (konflikt zapisu).");
}

export async function deleteLocation(id: string): Promise<boolean> {
  const kv = await getKv();
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await kv.get<Location[]>(LOCATIONS_KEY);
    const locations = res.value ?? [];
    if (!locations.some((l) => l.id === id)) return false;
    const commit = await kv.atomic()
      .check(res)
      .set(LOCATIONS_KEY, locations.filter((l) => l.id !== id))
      .delete([FORECAST_KEY, id])
      .delete([ACCURACY_STATS_KEY, id])
      .commit();
    if (!commit.ok) continue;

    try {
      await deleteVerifyDataForLocation(kv, id);
      await rebuildGlobalAccuracyStats();
    } catch {
      // Lokalizacja usunięta — ewentualne osierocone klucze weryfikacji są nieszkodliwe.
    }
    return true;
  }
  throw new Error("Nie udało się usunąć lokalizacji (konflikt zapisu).");
}

export async function getForecast(
  locationId: string,
): Promise<Forecast | null> {
  const kv = await getKv();
  const res = await kv.get<Forecast>([FORECAST_KEY, locationId]);
  return res.value;
}

export async function setForecast(forecast: Forecast): Promise<void> {
  const kv = await getKv();
  await kv.set([FORECAST_KEY, forecast.locationId], forecast);
}

export async function countForecasts(locationIds: string[]): Promise<{
  forecasts: number;
  newestForecastAt: string | null;
}> {
  const kv = await getKv();
  const results = await Promise.all(
    locationIds.map((id) => kv.get<Forecast>([FORECAST_KEY, id])),
  );
  let forecasts = 0;
  let newest: string | null = null;
  for (const res of results) {
    if (res.value) {
      forecasts++;
      if (!newest || res.value.generatedAt > newest) {
        newest = res.value.generatedAt;
      }
    }
  }
  return { forecasts, newestForecastAt: newest };
}

export interface ForecastLocationStatus {
  locationId: string;
  name: string;
  hasForecast: boolean;
  generatedAt: string | null;
  ageMinutes: number | null;
  sourceCount: number | null;
}

export async function getForecastStatus(): Promise<ForecastLocationStatus[]> {
  const locations = await listLocations();
  const kv = await getKv();
  const now = Date.now();
  const results = await Promise.all(
    locations.map((loc) => kv.get<Forecast>([FORECAST_KEY, loc.id])),
  );

  return locations.map((loc, i) => {
    const forecast = results[i].value;
    if (!forecast) {
      return {
        locationId: loc.id,
        name: loc.name,
        hasForecast: false,
        generatedAt: null,
        ageMinutes: null,
        sourceCount: null,
      };
    }
    const ageMs = now - Date.parse(forecast.generatedAt);
    const ageMinutes = Number.isFinite(ageMs)
      ? Math.max(0, Math.round(ageMs / 60_000))
      : null;
    return {
      locationId: loc.id,
      name: loc.name,
      hasForecast: true,
      generatedAt: forecast.generatedAt,
      ageMinutes,
      sourceCount: forecast.sources.length,
    };
  });
}

export function json(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}

export function errorJson(message: string, status: number): Response {
  return json({ error: message }, status);
}

// --- verification ---

export async function archivePendingVerifications(
  forecast: Forecast,
): Promise<number> {
  const kv = await getKv();
  const samples = sampleArchiveHours(forecast);
  for (const sample of samples) {
    await kv.set(
      [VERIFY_PENDING_KEY, forecast.locationId, sample.validTime],
      sample,
    );
  }
  return samples.length;
}

export async function listPendingVerifications(
  locationId: string,
): Promise<PendingVerification[]> {
  const kv = await getKv();
  const result: PendingVerification[] = [];
  for await (
    const entry of kv.list<PendingVerification>({
      prefix: [VERIFY_PENDING_KEY, locationId],
    })
  ) {
    if (entry.value) result.push(entry.value);
  }
  return result;
}

export async function deletePendingVerification(
  locationId: string,
  validTime: string,
): Promise<void> {
  const kv = await getKv();
  await kv.delete([VERIFY_PENDING_KEY, locationId, validTime]);
}

export async function getVerifiedPair(
  locationId: string,
  validTime: string,
): Promise<VerifiedPair | null> {
  const kv = await getKv();
  const res = await kv.get<VerifiedPair>([
    VERIFY_DONE_KEY,
    locationId,
    validTime,
  ]);
  return res.value;
}

export async function saveVerifiedPair(pair: VerifiedPair): Promise<void> {
  const kv = await getKv();
  await kv.set(
    [VERIFY_DONE_KEY, pair.locationId, pair.validTime],
    pair,
  );
  await pruneVerifiedHistory();
}

export async function listVerifiedPairs(
  limit = 50,
  locationId?: string,
): Promise<VerifiedPair[]> {
  const kv = await getKv();
  const pairs: VerifiedPair[] = [];
  const prefix = locationId ? [VERIFY_DONE_KEY, locationId] : [VERIFY_DONE_KEY];
  for await (
    const entry of kv.list<VerifiedPair>({ prefix })
  ) {
    if (entry.value) pairs.push(entry.value);
  }
  pairs.sort((a, b) => b.verifiedAt.localeCompare(a.verifiedAt));
  return pairs.slice(0, limit);
}

async function pruneVerifiedHistory(): Promise<void> {
  const kv = await getKv();
  const pairs: { key: Deno.KvKey; verifiedAt: string }[] = [];
  for await (
    const entry of kv.list<VerifiedPair>({ prefix: [VERIFY_DONE_KEY] })
  ) {
    if (entry.value) {
      pairs.push({ key: entry.key, verifiedAt: entry.value.verifiedAt });
    }
  }
  if (pairs.length <= MAX_VERIFIED_HISTORY) return;
  pairs.sort((a, b) => a.verifiedAt.localeCompare(b.verifiedAt));
  const toDelete = pairs.slice(0, pairs.length - MAX_VERIFIED_HISTORY);
  for (const item of toDelete) {
    await kv.delete(item.key);
  }
}

export async function getAccuracyStats(
  id: string,
): Promise<AccuracyStats | null> {
  const kv = await getKv();
  const res = await kv.get<AccuracyStats>([ACCURACY_STATS_KEY, id]);
  return res.value ? normalizeAccuracyStats(res.value) : null;
}

export async function getGlobalAccuracyStats(): Promise<AccuracyStats> {
  return (await getAccuracyStats(GLOBAL_ACCURACY_ID)) ?? emptyAccuracyStats();
}

export async function setAccuracyStats(
  id: string,
  stats: AccuracyStats,
): Promise<void> {
  const kv = await getKv();
  await kv.set([ACCURACY_STATS_KEY, id], stats);
}

export async function getAllLocationAccuracyStats(): Promise<
  { locationId: string; stats: AccuracyStats }[]
> {
  const locations = await listLocations();
  const results = await Promise.all(
    locations.map(async (loc) => {
      const stats = await getAccuracyStats(loc.id);
      return stats && stats.totalPairs > 0
        ? { locationId: loc.id, stats }
        : null;
    }),
  );
  return results.filter((x): x is NonNullable<typeof x> => x !== null);
}

export async function rebuildGlobalAccuracyStats(): Promise<AccuracyStats> {
  const locationStats = await getAllLocationAccuracyStats();
  const global = emptyAccuracyStats();
  if (locationStats.length === 0) {
    await setAccuracyStats(GLOBAL_ACCURACY_ID, global);
    return global;
  }

  const byLocation: Record<string, { count: number; accuracy: number }> = {};
  for (const { locationId, stats } of locationStats) {
    byLocation[locationId] = {
      count: stats.totalPairs,
      accuracy: stats.overallAccuracy,
    };
    for (const bucketKey of LEAD_BUCKETS) {
      const src = stats.buckets[bucketKey];
      const dst = global.buckets[bucketKey];
      dst.count += src.count;
      dst.tempMaeSum += src.tempMaeSum;
      dst.brierSum += src.brierSum;
    }
    global.totalPairs += stats.totalPairs;
  }

  for (const bucketKey of LEAD_BUCKETS) {
    const b = global.buckets[bucketKey];
    if (b.count > 0) {
      b.accuracy = bucketAccuracyFromSums(b.count, b.tempMaeSum, b.brierSum);
    }
  }

  global.overallAccuracy = overallAccuracyFromBuckets(global.buckets);
  global.updatedAt = new Date().toISOString();
  global.byLocation = byLocation;
  await setAccuracyStats(GLOBAL_ACCURACY_ID, global);
  return global;
}

export async function countPendingVerifications(): Promise<number> {
  const kv = await getKv();
  let count = 0;
  for await (const _ of kv.list({ prefix: [VERIFY_PENDING_KEY] })) {
    count++;
  }
  return count;
}

export async function countVerifiedPairs(): Promise<number> {
  const kv = await getKv();
  let count = 0;
  for await (const _ of kv.list({ prefix: [VERIFY_DONE_KEY] })) {
    count++;
  }
  return count;
}
