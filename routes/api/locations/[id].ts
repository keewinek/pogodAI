import { define } from "@/utils.ts";
import { deleteLocation, errorJson, getLocation, json } from "@/lib/db.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const location = await getLocation(ctx.params.id);
    if (!location) return errorJson("Nie znaleziono lokalizacji.", 404);
    return json(location);
  },

  async DELETE(ctx) {
    try {
      const removed = await deleteLocation(ctx.params.id);
      if (!removed) return errorJson("Nie znaleziono lokalizacji.", 404);
      return json({ ok: true });
    } catch {
      return errorJson(
        "Nie udało się usunąć lokalizacji — spróbuj ponownie.",
        503,
      );
    }
  },
});
