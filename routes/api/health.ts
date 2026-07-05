import { define } from "../../utils.ts";
import { getHealthStatus } from "../../lib/db.ts";
import { json } from "../../lib/http.ts";

export const handler = define.handlers({
  async GET() {
    const status = await getHealthStatus();
    return json(status);
  },
});
