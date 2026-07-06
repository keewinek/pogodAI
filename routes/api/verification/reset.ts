import { define } from "@/utils.ts";
import { clearAllVerificationData, json } from "@/lib/db.ts";

export const handler = define.handlers({
  async POST() {
    const removed = await clearAllVerificationData();
    return json({ ok: true, removed });
  },
});
