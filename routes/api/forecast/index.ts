import { define } from "../../../utils.ts";
import { getLocation, setForecast } from "../../../lib/db.ts";
import { requireBearer } from "../../../lib/auth.ts";
import { json, jsonError } from "../../../lib/http.ts";
import {
  validateForecastBody,
  validateForecastSize,
} from "../../../lib/validate.ts";

export const handler = define.handlers({
  async POST(ctx) {
    if (!requireBearer(ctx.req)) {
      return jsonError("Brak autoryzacji", 401);
    }

    let body: unknown;
    try {
      body = await ctx.req.json();
    } catch {
      return jsonError("Nieprawidłowe dane wejściowe", 400);
    }

    if (!validateForecastBody(body)) {
      return jsonError("Nieprawidłowy format prognozy", 400);
    }

    if (!validateForecastSize(body)) {
      return jsonError("Prognoza przekracza dozwolony rozmiar", 400);
    }

    const location = await getLocation(body.locationId);
    if (!location) {
      return jsonError("Nie znaleziono lokalizacji", 404);
    }

    await setForecast(body);
    return json({ ok: true });
  },
});
