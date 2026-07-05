import { define } from "../../../utils.ts";
import { addLocation, listLocations } from "../../../lib/db.ts";
import { json, jsonError } from "../../../lib/http.ts";
import { validateLocationInput } from "../../../lib/validate.ts";

export const handler = define.handlers({
  async GET() {
    const locations = await listLocations();
    return json({ locations });
  },

  async POST(ctx) {
    let body: unknown;
    try {
      body = await ctx.req.json();
    } catch {
      return jsonError("Nieprawidłowe dane wejściowe", 400);
    }

    const parsed = validateLocationInput(body);
    if (!parsed.ok) {
      return jsonError(parsed.error, 400);
    }

    const result = await addLocation(parsed.name, parsed.lat, parsed.lon);
    if (!result.ok) {
      return jsonError(result.error, result.status);
    }

    return json(result.location, 201);
  },
});
