import { define } from "@/utils.ts";
import { getLocation, setForecast } from "@/lib/db.ts";
import { errorJson, json } from "@/lib/db.ts";
import { validateForecast } from "@/lib/validate.ts";

const MAX_BODY_BYTES = 60 * 1024; // limit wartości Deno KV to 64 KiB

export const handler = define.handlers({
  async POST(ctx) {
    const raw = await ctx.req.text();
    if (raw.length > MAX_BODY_BYTES) {
      return errorJson("Body przekracza limit 60 KiB.", 400);
    }

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return errorJson("Nieprawidłowy JSON w body.", 400);
    }

    const parsed = validateForecast(body);
    if (!parsed.ok) return errorJson(parsed.error, 400);

    const location = await getLocation(parsed.value.locationId);
    if (!location) {
      return errorJson("Nie znaleziono lokalizacji o podanym locationId.", 404);
    }

    await setForecast(parsed.value);
    return json({ ok: true });
  },
});
