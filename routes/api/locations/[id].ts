import { define } from "@/utils.ts";
import { deleteLocation, errorJson, json } from "@/lib/db.ts";

export const handler = define.handlers({
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
