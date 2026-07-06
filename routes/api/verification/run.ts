import { define } from "@/utils.ts";
import {
  deletePendingVerification,
  getAccuracyStats,
  listLocations,
  listPendingVerifications,
  rebuildGlobalAccuracyStats,
  saveVerifiedPair,
  setAccuracyStats,
} from "@/lib/db.ts";
import { json } from "@/lib/db.ts";
import { fetchHourlyObservations } from "@/lib/observations.ts";
import {
  buildVerifiedPair,
  emptyAccuracyStats,
  isPendingStale,
  isReadyForVerification,
  isValidObservation,
  updateAccuracyStats,
} from "@/lib/verification.ts";

export const handler = define.handlers({
  async POST() {
    const now = new Date();
    const verifiedAt = now.toISOString();
    let verified = 0;
    let skipped = 0;
    let staleRemoved = 0;
    const errors: string[] = [];

    const locations = await listLocations();

    for (const location of locations) {
      const pending = await listPendingVerifications(location.id);

      const ready: typeof pending = [];
      for (const p of pending) {
        if (isPendingStale(p, now)) {
          await deletePendingVerification(location.id, p.validTime);
          staleRemoved++;
          continue;
        }
        if (isReadyForVerification(p.validTime, now)) {
          ready.push(p);
        }
      }

      if (ready.length === 0) continue;

      const observations = await fetchHourlyObservations(
        location.lat,
        location.lon,
        96,
      );
      if (!observations) {
        errors.push(`Open-Meteo niedostępne dla ${location.id}`);
        continue;
      }

      let locationStats = (await getAccuracyStats(location.id)) ??
        emptyAccuracyStats();

      for (const p of ready) {
        const obs = observations.get(p.validTime);
        if (!obs || !isValidObservation(obs.temperature, obs.precipitation)) {
          skipped++;
          continue;
        }

        const pair = buildVerifiedPair(
          p,
          location.id,
          location.name,
          obs.temperature,
          obs.precipitation,
          verifiedAt,
        );

        await saveVerifiedPair(pair);
        locationStats = updateAccuracyStats(locationStats, pair);
        await deletePendingVerification(location.id, p.validTime);
        verified++;
      }

      if (locationStats.totalPairs > 0) {
        await setAccuracyStats(location.id, locationStats);
      }
    }

    const global = await rebuildGlobalAccuracyStats();

    return json({
      ok: true,
      verified,
      skipped,
      staleRemoved,
      errors,
      globalAccuracy: global.overallAccuracy,
      totalPairs: global.totalPairs,
    });
  },
});
