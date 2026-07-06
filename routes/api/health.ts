import { define } from "@/utils.ts";
import { countForecasts, json, listLocations, pingKv } from "@/lib/db.ts";

export const handler = define.handlers({
  async GET() {
    const kv = await pingKv();
    if (!kv) {
      return json({
        ok: false,
        kv: false,
        error:
          "Brak połączenia z Deno KV — przypisz bazę do aplikacji w Deno Deploy.",
      }, 503);
    }

    const locations = await listLocations();
    const { forecasts, newestForecastAt } = await countForecasts(
      locations.map((l) => l.id),
    );
    return json({
      ok: true,
      kv: true,
      locations: locations.length,
      forecasts,
      newestForecastAt,
    });
  },
});
