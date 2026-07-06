import type {
  AccuracyStats,
  LeadBucket,
  VerifiedPair,
} from "./verification.ts";
import {
  LEAD_BUCKETS,
  leadBucketLabel,
  PRELIMINARY_PAIR_THRESHOLD,
} from "./verification.ts";

export interface AccuracyBucketBrief {
  count: number;
  accuracy: number;
  label: string;
}

export interface AccuracyInsights {
  weakestBucket: LeadBucket | null;
  weakestAccuracy: number | null;
  avgTempError: number | null;
  tempBias: number | null;
  avgBrier: number | null;
  hints: string[];
}

export interface RecentPairBrief {
  validTime: string;
  leadBucket: LeadBucket;
  leadHours: number;
  predictedTemp: number;
  actualTemp: number;
  predictedPrecipChance: number;
  actualRain: boolean;
  tempError: number;
  pairScore: number;
}

export interface LocationAccuracyBrief {
  locationId: string;
  name: string;
  hasData: boolean;
  preliminary: boolean;
  overallAccuracy: number;
  totalPairs: number;
  updatedAt: string | null;
  buckets: Record<LeadBucket, AccuracyBucketBrief>;
  insights: AccuracyInsights;
  recentPairs: RecentPairBrief[];
}

export interface GlobalAccuracyBrief {
  hasData: boolean;
  preliminary: boolean;
  overallAccuracy: number;
  totalPairs: number;
  updatedAt: string | null;
  buckets: Record<LeadBucket, AccuracyBucketBrief>;
  byLocation: {
    locationId: string;
    name: string;
    accuracy: number;
    count: number;
    preliminary: boolean;
  }[];
  methodology: {
    sampleHoursPerForecast: number;
    minLeadHours: number;
    maxLeadHours: number;
    tempScoreFormula: string;
    precipRainThresholdMm: number;
    precipChanceRainThreshold: number;
  };
}

function bucketBriefs(
  stats: AccuracyStats,
): Record<LeadBucket, AccuracyBucketBrief> {
  const out = {} as Record<LeadBucket, AccuracyBucketBrief>;
  for (const b of LEAD_BUCKETS) {
    const src = stats.buckets[b];
    out[b] = {
      count: src.count,
      accuracy: src.count > 0 ? round2(src.accuracy) : 0,
      label: leadBucketLabel(b),
    };
  }
  return out;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function buildAccuracyInsights(
  stats: AccuracyStats,
  recentPairs: VerifiedPair[],
): AccuracyInsights {
  const hints: string[] = [];

  let weakestBucket: LeadBucket | null = null;
  let weakestAccuracy: number | null = null;
  for (const b of LEAD_BUCKETS) {
    const bucket = stats.buckets[b];
    if (bucket.count < 2) continue;
    if (weakestAccuracy === null || bucket.accuracy < weakestAccuracy) {
      weakestAccuracy = bucket.accuracy;
      weakestBucket = b;
    }
  }

  if (weakestBucket && weakestAccuracy !== null && weakestAccuracy < 70) {
    hints.push(
      `Słabszy horyzont ${leadBucketLabel(weakestBucket)} (${
        round2(weakestAccuracy)
      }%) — przy syntezie daj większą wagę modelom numerycznym i lokalnym (IMGW) w tym zakresie.`,
    );
  }

  const pairs = recentPairs.slice(0, 20);
  let avgTempError: number | null = null;
  let tempBias: number | null = null;
  let avgBrier: number | null = null;

  if (pairs.length > 0) {
    const tempErrors = pairs.map((p) => p.tempError);
    avgTempError = round2(
      tempErrors.reduce((a, b) => a + b, 0) / tempErrors.length,
    );
    const signed = pairs.map((p) => p.predictedTemp - p.actualTemp);
    tempBias = round2(signed.reduce((a, b) => a + b, 0) / signed.length);
    avgBrier = round2(
      pairs.reduce((a, p) => a + p.brierScore, 0) / pairs.length,
    );

    if (tempBias >= 1.5) {
      hints.push(
        `Tendencja do zawyżania temperatury o ~${
          Math.abs(tempBias)
        }°C — obniż prognozę temp względem surowego konsensusu.`,
      );
    } else if (tempBias <= -1.5) {
      hints.push(
        `Tendencja do zaniżania temperatury o ~${
          Math.abs(tempBias)
        }°C — podnieś prognozę temp względem surowego konsensusu.`,
      );
    }

    if (avgBrier > 0.25) {
      hints.push(
        "Słaba kalibracja opadów (wysoki Brier) — przy braku zgodności źródeł nie ustawiaj skrajnych %; preferuj IMGW + modele ensemble.",
      );
    }

    const badPrecip = pairs.filter((p) =>
      p.pairScore < 60 && p.brierScore > 0.2
    );
    if (badPrecip.length >= 3) {
      hints.push(
        "Wielokrotne pudła na opadach — gdy modele się rozjeżdżają, opisz niepewność w werdykcie zamiast pewnego „deszcz/słońce”.",
      );
    }
  }

  if (stats.totalPairs > 0 && stats.totalPairs < PRELIMINARY_PAIR_THRESHOLD) {
    hints.push(
      `Wstępne dane (${stats.totalPairs}/${PRELIMINARY_PAIR_THRESHOLD} par) — traktuj hints ostrożnie, ale i tak kalibruj pod metrykę temp+opady.`,
    );
  }

  if (hints.length === 0 && stats.totalPairs >= PRELIMINARY_PAIR_THRESHOLD) {
    hints.push(
      "Brak wyraźnych słabości w ostatnich parach — utrzymaj dotychczasową strategię syntezy.",
    );
  }

  return {
    weakestBucket,
    weakestAccuracy: weakestAccuracy !== null ? round2(weakestAccuracy) : null,
    avgTempError,
    tempBias,
    avgBrier,
    hints,
  };
}

export function toRecentPairBrief(pair: VerifiedPair): RecentPairBrief {
  return {
    validTime: pair.validTime,
    leadBucket: pair.leadBucket,
    leadHours: pair.leadHours,
    predictedTemp: pair.predictedTemp,
    actualTemp: pair.actualTemp,
    predictedPrecipChance: pair.predictedPrecipChance,
    actualRain: pair.actualRain,
    tempError: pair.tempError,
    pairScore: round2(pair.pairScore),
  };
}

export function buildLocationAccuracyBrief(
  locationId: string,
  name: string,
  stats: AccuracyStats | null,
  recentPairs: VerifiedPair[],
): LocationAccuracyBrief {
  const hasData = stats !== null && stats.totalPairs > 0;
  const preliminary = hasData &&
    stats!.totalPairs < PRELIMINARY_PAIR_THRESHOLD;
  const emptyBuckets = bucketBriefs({
    updatedAt: "",
    totalPairs: 0,
    overallAccuracy: 0,
    buckets: {
      hourly: { count: 0, tempMaeSum: 0, brierSum: 0, accuracy: 0 },
      day1: { count: 0, tempMaeSum: 0, brierSum: 0, accuracy: 0 },
      day2: { count: 0, tempMaeSum: 0, brierSum: 0, accuracy: 0 },
      day3: { count: 0, tempMaeSum: 0, brierSum: 0, accuracy: 0 },
    },
  });

  if (!hasData) {
    return {
      locationId,
      name,
      hasData: false,
      preliminary: false,
      overallAccuracy: 0,
      totalPairs: 0,
      updatedAt: null,
      buckets: emptyBuckets,
      insights: {
        weakestBucket: null,
        weakestAccuracy: null,
        avgTempError: null,
        tempBias: null,
        avgBrier: null,
        hints: [
          "Brak historii sprawdzalności — priorytet: poprawna godzinówka z Open-Meteo i ostrożne % opadów.",
        ],
      },
      recentPairs: [],
    };
  }

  return {
    locationId,
    name,
    hasData: true,
    preliminary,
    overallAccuracy: round2(stats!.overallAccuracy),
    totalPairs: stats!.totalPairs,
    updatedAt: stats!.updatedAt,
    buckets: bucketBriefs(stats!),
    insights: buildAccuracyInsights(stats!, recentPairs),
    recentPairs: recentPairs.map(toRecentPairBrief),
  };
}

export function buildGlobalAccuracyBrief(
  global: AccuracyStats,
  locations: { id: string; name: string; stats: AccuracyStats | null }[],
): GlobalAccuracyBrief {
  const hasData = global.totalPairs > 0;
  const preliminary = hasData &&
    global.totalPairs < PRELIMINARY_PAIR_THRESHOLD;

  return {
    hasData,
    preliminary,
    overallAccuracy: round2(global.overallAccuracy),
    totalPairs: global.totalPairs,
    updatedAt: hasData ? global.updatedAt : null,
    buckets: bucketBriefs(global),
    byLocation: locations.map(({ id, name, stats }) => ({
      locationId: id,
      name,
      accuracy: stats ? round2(stats.overallAccuracy) : 0,
      count: stats?.totalPairs ?? 0,
      preliminary: (stats?.totalPairs ?? 0) > 0 &&
        (stats?.totalPairs ?? 0) < PRELIMINARY_PAIR_THRESHOLD,
    })),
    methodology: {
      sampleHoursPerForecast: 4,
      minLeadHours: 6,
      maxLeadHours: 84,
      tempScoreFormula: "max(0, 100 - |błąd°C| × 10)",
      precipRainThresholdMm: 0.1,
      precipChanceRainThreshold: 50,
    },
  };
}
