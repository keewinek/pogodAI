import { define } from "@/utils.ts";
import { getForecast } from "@/lib/db.ts";
import { errorJson, json } from "@/lib/db.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const forecast = await getForecast(ctx.params.id);
    if (!forecast) {
      return errorJson("Brak prognozy dla tej lokalizacji", 404);
    }
    return json(forecast, 200, { "Cache-Control": "no-store" });
  },
});
