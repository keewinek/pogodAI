import { define } from "../../../utils.ts";
import { getForecast } from "../../../lib/db.ts";
import { json, jsonError } from "../../../lib/http.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const locationId = ctx.params.id;
    const forecast = await getForecast(locationId);
    if (!forecast) {
      return jsonError("Brak prognozy dla tej lokalizacji", 404);
    }

    return json(forecast, 200, { "Cache-Control": "no-store" });
  },
});
