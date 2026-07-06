import type { Forecast, HourForecast } from "./db.ts";

/** Koszyki horyzontu — rozdzielczość maleje wraz ze wzrostem lead time (skill decay). */
export type LeadBucket =
  | "hourly"
  | "day1"
  | "day2"
  | "day3"
  | "day4"
  | "day5"
  | "day6"
  | "day7"
  | "week2";

export interface PendingVerification {
  validTime: string;
  generatedAt: string;
  leadHours: number;
  predictedTemp: number;
  predictedPrecipChance: number;
}

export interface VerifiedPair {
  locationId: string;
  locationName: string;
  validTime: string;
  generatedAt: string;
  leadHours: number;
  leadBucket: LeadBucket;
  predictedTemp: number;
  predictedPrecipChance: number;
  predictedRain: boolean;
  actualTemp: number;
  actualRain: boolean;
  actualPrecipMm: number;
  tempError: number;
  brierScore: number;
  pairScore: number;
  verifiedAt: string;
}

export interface BucketStats {
  count: number;
  tempMaeSum: number;
  brierSum: number;
  accuracy: number;
}

export interface AccuracyStats {
  updatedAt: string;
  totalPairs: number;
  overallAccuracy: number;
  buckets: Record<LeadBucket, BucketStats>;
  byLocation?: Record<string, { count: number; accuracy: number }>;
}

export const LEAD_BUCKETS: LeadBucket[] = [
  "hourly",
  "day1",
  "day2",
  "day3",
  "day4",
  "day5",
  "day6",
  "day7",
  "week2",
];
export const PRECIP_RAIN_THRESHOLD_MM = 0.1;
export const PRECIP_CHANCE_RAIN_THRESHOLD = 50;
export const MIN_LEAD_HOURS = 6;
/** 14 dni × 24 h — zgodnie z długością prognozy w days[]. */
export const MAX_LEAD_HOURS = 336;
/** Bufor na opóźnioną weryfikację — pobieranie obserwacji Open-Meteo. */
export const OBSERVATION_HOURS_BACK = MAX_LEAD_HOURS + 48;
/** Jedna zamrożona próbka na koszyk horyzontu (stratyfikacja). */
export const SAMPLE_HOURS_PER_FORECAST = LEAD_BUCKETS.length;
export const STALE_PENDING_DAYS = 7;
export const MAX_VERIFIED_HISTORY = 200;
export const PRELIMINARY_PAIR_THRESHOLD = 10;

const emptyBucket = (): BucketStats => ({
  count: 0,
  tempMaeSum: 0,
  brierSum: 0,
  accuracy: 0,
});

const EMPTY_BUCKETS = (): Record<LeadBucket, BucketStats> => {
  const buckets = {} as Record<LeadBucket, BucketStats>;
  for (const b of LEAD_BUCKETS) buckets[b] = emptyBucket();
  return buckets;
};

export function emptyAccuracyStats(): AccuracyStats {
  return {
    updatedAt: new Date().toISOString(),
    totalPairs: 0,
    overallAccuracy: 0,
    buckets: EMPTY_BUCKETS(),
  };
}

/** Bezpieczna wersja — zwraca null zamiast rzucać. */
export function tryWarsawLocalToDate(isoLocal: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):00$/.exec(isoLocal);
  if (!match) return null;
  const [, y, mo, d, h] = match;
  const month = Number(mo);
  const day = Number(d);
  const hour = Number(h);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23) {
    return null;
  }
  const target = `${y}-${mo}-${d}T${h}:00:00`;
  const dayMs = Date.parse(`${y}-${mo}-${d}T12:00:00Z`);
  if (!Number.isFinite(dayMs)) return null;
  const fmt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  for (let offset = -36; offset <= 36; offset++) {
    const candidate = new Date(dayMs + offset * 3_600_000);
    const formatted = fmt.format(candidate).replace(" ", "T");
    if (formatted.startsWith(target)) return candidate;
  }
  return null;
}

export function computeLeadHours(
  generatedAt: string,
  validTime: string,
): number | null {
  const genMs = new Date(generatedAt).getTime();
  if (!Number.isFinite(genMs)) return null;
  const validDate = tryWarsawLocalToDate(validTime);
  if (!validDate) return null;
  return Math.max(0, Math.round((validDate.getTime() - genMs) / 3_600_000));
}

export function leadBucket(leadHours: number): LeadBucket | null {
  if (!Number.isFinite(leadHours)) return null;
  if (leadHours < 12) return "hourly";
  if (leadHours < 36) return "day1";
  if (leadHours < 60) return "day2";
  if (leadHours < 84) return "day3";
  if (leadHours < 108) return "day4";
  if (leadHours < 132) return "day5";
  if (leadHours < 156) return "day6";
  if (leadHours < 180) return "day7";
  if (leadHours <= MAX_LEAD_HOURS) return "week2";
  return null;
}

/** Uzupełnia brakujące koszyki w starszych statystykach (np. sprzed rozszerzenia do 14 dni). */
export function normalizeAccuracyStats(stats: AccuracyStats): AccuracyStats {
  const buckets = EMPTY_BUCKETS();
  for (const b of LEAD_BUCKETS) {
    const existing = stats.buckets[b];
    if (existing) buckets[b] = { ...existing };
  }
  return {
    ...stats,
    buckets,
    overallAccuracy: overallAccuracyFromBuckets(buckets),
  };
}

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededShuffle<T>(items: T[], seed: string): T[] {
  const arr = [...items];
  let state = hashSeed(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const j = state % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function sampleArchiveHours(forecast: Forecast): PendingVerification[] {
  const candidates: {
    hour: HourForecast;
    leadHours: number;
    bucket: LeadBucket;
  }[] = [];

  for (const day of forecast.days) {
    for (const hour of day.hours) {
      if (!hour.time.startsWith(day.date)) continue;
      const leadHours = computeLeadHours(forecast.generatedAt, hour.time);
      if (leadHours === null) continue;
      const bucket = leadBucket(leadHours);
      if (
        bucket &&
        leadHours >= MIN_LEAD_HOURS &&
        leadHours <= MAX_LEAD_HOURS
      ) {
        candidates.push({ hour, leadHours, bucket });
      }
    }
  }

  if (candidates.length === 0) return [];

  const byBucket = new Map<LeadBucket, typeof candidates>();
  for (const b of LEAD_BUCKETS) byBucket.set(b, []);
  for (const c of candidates) byBucket.get(c.bucket)!.push(c);

  const seed = `${forecast.locationId}:${forecast.generatedAt}`;
  const picked: typeof candidates = [];
  const usedTimes = new Set<string>();

  for (const bucket of LEAD_BUCKETS) {
    const pool = seededShuffle(byBucket.get(bucket)!, `${seed}:${bucket}`);
    const first = pool.find((c) => !usedTimes.has(c.hour.time));
    if (first) {
      picked.push(first);
      usedTimes.add(first.hour.time);
    }
  }

  const remaining = seededShuffle(
    candidates.filter((c) => !usedTimes.has(c.hour.time)),
    `${seed}:fill`,
  );
  for (const c of remaining) {
    if (picked.length >= SAMPLE_HOURS_PER_FORECAST) break;
    picked.push(c);
    usedTimes.add(c.hour.time);
  }

  return picked.map(({ hour, leadHours }) => ({
    validTime: hour.time,
    generatedAt: forecast.generatedAt,
    leadHours,
    predictedTemp: hour.temperature,
    predictedPrecipChance: hour.precipitationChance,
  }));
}

export function scoreTemperature(predicted: number, actual: number): number {
  const error = Math.abs(predicted - actual);
  return Math.max(0, 100 - error * 10);
}

export function scorePrecipitation(
  predictedChance: number,
  actualRain: boolean,
): { brierScore: number; precipScore: number } {
  const p = predictedChance / 100;
  const o = actualRain ? 1 : 0;
  const brierScore = (p - o) ** 2;
  return { brierScore, precipScore: (1 - brierScore) * 100 };
}

export function pairScore(tempScore: number, precipScore: number): number {
  return (tempScore + precipScore) / 2;
}

export function bucketAccuracyFromSums(
  count: number,
  tempMaeSum: number,
  brierSum: number,
): number {
  if (count === 0) return 0;
  const mae = tempMaeSum / count;
  const avgBrier = brierSum / count;
  const tempScore = Math.max(0, 100 - mae * 10);
  const precipScore = (1 - avgBrier) * 100;
  return pairScore(tempScore, precipScore);
}

export function overallAccuracyFromBuckets(
  buckets: Record<LeadBucket, BucketStats>,
): number {
  let totalCount = 0;
  let weightedSum = 0;
  for (const b of LEAD_BUCKETS) {
    const bucket = buckets[b];
    if (bucket.count > 0) {
      weightedSum += bucket.accuracy * bucket.count;
      totalCount += bucket.count;
    }
  }
  return totalCount > 0 ? weightedSum / totalCount : 0;
}

export function updateAccuracyStats(
  stats: AccuracyStats,
  pair: VerifiedPair,
): AccuracyStats {
  const buckets = { ...normalizeAccuracyStats(stats).buckets };
  const bucket = { ...buckets[pair.leadBucket] };
  bucket.count += 1;
  bucket.tempMaeSum += pair.tempError;
  bucket.brierSum += pair.brierScore;
  bucket.accuracy = bucketAccuracyFromSums(
    bucket.count,
    bucket.tempMaeSum,
    bucket.brierSum,
  );
  buckets[pair.leadBucket] = bucket;

  return {
    updatedAt: pair.verifiedAt,
    totalPairs: stats.totalPairs + 1,
    buckets,
    overallAccuracy: overallAccuracyFromBuckets(buckets),
    byLocation: stats.byLocation,
  };
}

export function buildVerifiedPair(
  pending: PendingVerification,
  locationId: string,
  locationName: string,
  actualTemp: number,
  actualPrecipMm: number,
  verifiedAt: string,
): VerifiedPair {
  const actualRain = actualPrecipMm >= PRECIP_RAIN_THRESHOLD_MM;
  const tempError = Math.abs(pending.predictedTemp - actualTemp);
  const { brierScore, precipScore } = scorePrecipitation(
    pending.predictedPrecipChance,
    actualRain,
  );
  const tScore = scoreTemperature(pending.predictedTemp, actualTemp);
  const bucket = leadBucket(pending.leadHours);
  if (!bucket) {
    throw new Error(`Nieprawidłowy leadHours: ${pending.leadHours}`);
  }

  return {
    locationId,
    locationName,
    validTime: pending.validTime,
    generatedAt: pending.generatedAt,
    leadHours: pending.leadHours,
    leadBucket: bucket,
    predictedTemp: pending.predictedTemp,
    predictedPrecipChance: pending.predictedPrecipChance,
    predictedRain:
      pending.predictedPrecipChance >= PRECIP_CHANCE_RAIN_THRESHOLD,
    actualTemp,
    actualRain,
    actualPrecipMm,
    tempError,
    brierScore,
    pairScore: pairScore(tScore, precipScore),
    verifiedAt,
  };
}

export function isValidObservation(
  temp: number | null | undefined,
  precip: number | null | undefined,
): boolean {
  if (temp == null || precip == null) return false;
  if (!Number.isFinite(temp) || !Number.isFinite(precip)) return false;
  if (temp < -50 || temp > 55) return false;
  if (precip < 0 || precip > 500) return false;
  return true;
}

export function isPendingStale(
  pending: PendingVerification,
  now = new Date(),
): boolean {
  const validDate = tryWarsawLocalToDate(pending.validTime);
  if (!validDate) return true;
  const ageMs = now.getTime() - validDate.getTime();
  return ageMs > STALE_PENDING_DAYS * 24 * 3_600_000;
}

export function isReadyForVerification(
  validTime: string,
  now = new Date(),
): boolean {
  const validDate = tryWarsawLocalToDate(validTime);
  if (!validDate) return false;
  return now.getTime() >= validDate.getTime() + 3_600_000;
}

export function formatAccuracyPl(value: number): string {
  return new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value) + "%";
}

export function leadBucketLabel(bucket: LeadBucket): string {
  switch (bucket) {
    case "hourly":
      return "0–12 h";
    case "day1":
      return "12–36 h (1 dzień)";
    case "day2":
      return "36–60 h (2 dni)";
    case "day3":
      return "60–84 h (3 dni)";
    case "day4":
      return "84–108 h (4 dni)";
    case "day5":
      return "108–132 h (5 dni)";
    case "day6":
      return "132–156 h (6 dni)";
    case "day7":
      return "156–180 h (7 dni)";
    case "week2":
      return "180–336 h (8–14 dni)";
  }
}

export function formatValidTime(validTime: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):00$/.exec(validTime);
  if (!match) return validTime;
  const m = match[2];
  const d = match[3];
  const hour = match[4];
  const MONTHS = [
    "sty",
    "lut",
    "mar",
    "kwi",
    "maj",
    "cze",
    "lip",
    "sie",
    "wrz",
    "paź",
    "lis",
    "gru",
  ];
  const monthLabel = MONTHS[Number(m) - 1];
  if (!monthLabel) return validTime;
  return `${Number(d)} ${monthLabel}, ${hour}:00`;
}
