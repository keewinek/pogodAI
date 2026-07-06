import { define } from "@/utils.ts";
import { getForecastStatus, json } from "@/lib/db.ts";

export const handler = define.handlers({
  async GET() {
    const locations = await getForecastStatus();
    const withForecast = locations.filter((l) => l.hasForecast).length;
    const freshest = locations
      .filter((l) => l.generatedAt)
      .sort((a, b) =>
        (b.generatedAt ?? "").localeCompare(a.generatedAt ?? "")
      )[0];

    return json({
      ok: true,
      total: locations.length,
      withForecast,
      newestForecastAt: freshest?.generatedAt ?? null,
      locations,
    });
  },
});
