import { define } from "@/utils.ts";
import {
  deletePendingVerification,
  getAccuracyStats,
  getVerifiedPair,
  json,
  listLocations,
  listPendingVerifications,
  rebuildGlobalAccuracyStats,
  saveVerifiedPair,
  setAccuracyStats,
} from "@/lib/db.ts";
import { fetchHourlyObservations } from "@/lib/observations.ts";
import {
  buildVerifiedPair,
  emptyAccuracyStats,
  isPendingStale,
  isReadyForVerification,
  isValidObservation,
  OBSERVATION_HOURS_BACK,
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

    try {
      const locations = await listLocations();

      for (const location of locations) {
        const pending = await listPendingVerifications(location.id);

        const ready: typeof pending = [];
        for (const p of pending) {
          try {
            if (isPendingStale(p, now)) {
              await deletePendingVerification(location.id, p.validTime);
              staleRemoved++;
              continue;
            }
            if (isReadyForVerification(p.validTime, now)) {
              ready.push(p);
            }
          } catch (err) {
            errors.push(
              `Uszkodzony pending ${location.id}/${p.validTime}: ${
                err instanceof Error ? err.message : "błąd"
              }`,
            );
            await deletePendingVerification(location.id, p.validTime);
            staleRemoved++;
          }
        }

        if (ready.length === 0) continue;

        const observations = await fetchHourlyObservations(
          location.lat,
          location.lon,
          OBSERVATION_HOURS_BACK,
        );
        if (!observations) {
          errors.push(`Open-Meteo niedostępne dla ${location.id}`);
          continue;
        }

        let locationStats = (await getAccuracyStats(location.id)) ??
          emptyAccuracyStats();

        for (const p of ready) {
          try {
            const existing = await getVerifiedPair(location.id, p.validTime);
            if (existing) {
              await deletePendingVerification(location.id, p.validTime);
              continue;
            }

            const obs = observations.get(p.validTime);
            if (
              !obs || !isValidObservation(obs.temperature, obs.precipitation)
            ) {
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

            await deletePendingVerification(location.id, p.validTime);
            await saveVerifiedPair(pair);
            locationStats = updateAccuracyStats(locationStats, pair);
            verified++;
          } catch (err) {
            errors.push(
              `Weryfikacja ${location.id}/${p.validTime}: ${
                err instanceof Error ? err.message : "błąd"
              }`,
            );
            skipped++;
          }
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
    } catch (err) {
      return json(
        {
          ok: false,
          error: err instanceof Error ? err.message : "Nieznany błąd",
          verified,
          skipped,
          staleRemoved,
          errors,
        },
        500,
      );
    }
  },
});
