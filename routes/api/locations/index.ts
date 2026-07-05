import { define } from "@/utils.ts";
import { addLocation, listLocations } from "@/lib/db.ts";
import { errorJson, json } from "@/lib/http.ts";
import { validateNewLocation } from "@/lib/validate.ts";
import { slugify } from "@/lib/slug.ts";

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
      return errorJson("Nieprawidłowy JSON w body.", 400);
    }

    const parsed = validateNewLocation(body);
    if (!parsed.ok) return errorJson(parsed.error, 400);

    const id = slugify(parsed.value.name);
    if (!id) {
      return errorJson("Nie udało się utworzyć id z podanej nazwy.", 400);
    }

    const result = await addLocation({
      id,
      name: parsed.value.name,
      lat: parsed.value.lat,
      lon: parsed.value.lon,
      createdAt: new Date().toISOString(),
    });

    if (!result.ok) return errorJson(result.error, result.status);
    return json(result.location, 201);
  },
});
