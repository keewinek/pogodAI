import { define } from "@/utils.ts";
import { addLocation, errorJson, json, listLocations } from "@/lib/db.ts";
import { generateLocationId, validateNewLocation } from "@/lib/validate.ts";

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

    const locations = await listLocations();
    const id = generateLocationId(
      parsed.value.name,
      locations.map((l) => l.id),
    );
    if (!id) {
      return errorJson("Nie udało się utworzyć id z podanej nazwy.", 400);
    }

    try {
      const result = await addLocation({
        id,
        name: parsed.value.name,
        lat: parsed.value.lat,
        lon: parsed.value.lon,
        createdAt: new Date().toISOString(),
      });

      if (!result.ok) return errorJson(result.error, result.status);
      return json(result.location, 201);
    } catch {
      return errorJson(
        "Nie udało się zapisać lokalizacji — spróbuj ponownie.",
        503,
      );
    }
  },
});
