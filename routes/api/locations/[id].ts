import { define } from "@/utils.ts";
import { deleteLocation } from "@/lib/db.ts";
import { errorJson, json } from "@/lib/http.ts";

export const handler = define.handlers({
  async DELETE(ctx) {
    const removed = await deleteLocation(ctx.params.id);
    if (!removed) return errorJson("Nie znaleziono lokalizacji.", 404);
    return json({ ok: true });
  },
});
