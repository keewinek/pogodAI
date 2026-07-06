import { define } from "@/utils.ts";
import {
  listLocations,
  rebuildGlobalAccuracyStats,
  saveVerifiedPair,
  setAccuracyStats,
} from "@/lib/db.ts";
import { json } from "@/lib/db.ts";
import type { LeadBucket } from "@/lib/verification.ts";
import {
  buildVerifiedPair,
  emptyAccuracyStats,
  updateAccuracyStats,
} from "@/lib/verification.ts";

/** Przykładowe pary do testów UI — nie używać w produkcji na stałe. */
const SAMPLES: {
  leadBucket: LeadBucket;
  leadHours: number;
  hoursAgo: number;
  predictedTemp: number;
  predictedPrecipChance: number;
  actualTemp: number;
  actualPrecipMm: number;
}[] = [
  {
    leadBucket: "hourly",
    leadHours: 8,
    hoursAgo: 2,
    predictedTemp: 22,
    predictedPrecipChance: 20,
    actualTemp: 21,
    actualPrecipMm: 0,
  },
  {
    leadBucket: "hourly",
    leadHours: 10,
    hoursAgo: 5,
    predictedTemp: 19,
    predictedPrecipChance: 65,
    actualTemp: 18,
    actualPrecipMm: 0.4,
  },
  {
    leadBucket: "day1",
    leadHours: 24,
    hoursAgo: 12,
    predictedTemp: 17,
    predictedPrecipChance: 80,
    actualTemp: 16,
    actualPrecipMm: 1.2,
  },
  {
    leadBucket: "day1",
    leadHours: 30,
    hoursAgo: 20,
    predictedTemp: 15,
    predictedPrecipChance: 40,
    actualTemp: 17,
    actualPrecipMm: 0,
  },
  {
    leadBucket: "day2",
    leadHours: 42,
    hoursAgo: 28,
    predictedTemp: 14,
    predictedPrecipChance: 55,
    actualTemp: 13,
    actualPrecipMm: 0.2,
  },
  {
    leadBucket: "day2",
    leadHours: 48,
    hoursAgo: 36,
    predictedTemp: 12,
    predictedPrecipChance: 10,
    actualTemp: 11,
    actualPrecipMm: 0,
  },
  {
    leadBucket: "day3",
    leadHours: 60,
    hoursAgo: 44,
    predictedTemp: 11,
    predictedPrecipChance: 70,
    actualTemp: 10,
    actualPrecipMm: 0.8,
  },
  {
    leadBucket: "day3",
    leadHours: 72,
    hoursAgo: 52,
    predictedTemp: 9,
    predictedPrecipChance: 25,
    actualTemp: 12,
    actualPrecipMm: 0,
  },
];

function warsawHourKey(hoursAgo: number, now: Date): string {
  const t = new Date(now.getTime() - hoursAgo * 3_600_000);
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(t);
  const hour = new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    hour: "2-digit",
    hour12: false,
  }).format(t).padStart(2, "0");
  return `${date}T${hour}:00`;
}

export const handler = define.handlers({
  async POST() {
    const now = new Date();
    const verifiedAt = now.toISOString();
    const locations = await listLocations();
    let seeded = 0;

    for (const location of locations) {
      let stats = emptyAccuracyStats();

      for (let i = 0; i < SAMPLES.length; i++) {
        const s = SAMPLES[i];
        const validTime = warsawHourKey(s.hoursAgo + i, now);
        const generatedAt = new Date(
          now.getTime() - (s.leadHours + s.hoursAgo) * 3_600_000,
        ).toISOString();

        const pending = {
          validTime,
          generatedAt,
          leadHours: s.leadHours,
          predictedTemp: s.predictedTemp + (location.lat > 53 ? -2 : 0),
          predictedPrecipChance: s.predictedPrecipChance,
        };

        const pair = buildVerifiedPair(
          pending,
          location.id,
          location.name,
          s.actualTemp + (location.lat > 53 ? -1 : 0),
          s.actualPrecipMm,
          verifiedAt,
        );
        pair.leadBucket = s.leadBucket;
        pair.leadHours = s.leadHours;

        await saveVerifiedPair(pair);
        stats = updateAccuracyStats(stats, pair);
        seeded++;
      }

      await setAccuracyStats(location.id, stats);
    }

    const global = await rebuildGlobalAccuracyStats();

    return json({
      ok: true,
      seeded,
      locations: locations.length,
      globalAccuracy: global.overallAccuracy,
      totalPairs: global.totalPairs,
    });
  },
});
