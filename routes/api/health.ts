import { define } from "@/utils.ts";
import {
  countForecasts,
  countPendingVerifications,
  countVerifiedPairs,
  getGlobalAccuracyStats,
  json,
  listLocations,
} from "@/lib/db.ts";

export const handler = define.handlers({
  async GET() {
    const locations = await listLocations();
    const { forecasts, newestForecastAt } = await countForecasts(
      locations.map((l) => l.id),
    );
    const [globalStats, pendingCount, verifiedCount] = await Promise.all([
      getGlobalAccuracyStats(),
      countPendingVerifications(),
      countVerifiedPairs(),
    ]);
    return json({
      ok: true,
      locations: locations.length,
      forecasts,
      newestForecastAt,
      globalAccuracy: globalStats.overallAccuracy,
      totalVerifiedPairs: globalStats.totalPairs,
      pendingVerifications: pendingCount,
      verifiedHistoryEntries: verifiedCount,
    });
  },
});
