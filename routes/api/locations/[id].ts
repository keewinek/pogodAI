import { define } from "../../../utils.ts";
import { deleteLocation } from "../../../lib/db.ts";
import { json, jsonError } from "../../../lib/http.ts";

export const handler = define.handlers({
  async DELETE(ctx) {
    const id = ctx.params.id;
    const deleted = await deleteLocation(id);
    if (!deleted) {
      return jsonError("Nie znaleziono lokalizacji", 404);
    }
    return json({ ok: true });
  },
});
