import { define } from "@/utils.ts";
import { countForecasts, json, listLocations } from "@/lib/db.ts";

export const handler = define.handlers({
  async GET() {
    const locations = await listLocations();
    const { forecasts, newestForecastAt } = await countForecasts(
      locations.map((l) => l.id),
    );
    return json({
      ok: true,
      locations: locations.length,
      forecasts,
      newestForecastAt,
    });
  },
});
