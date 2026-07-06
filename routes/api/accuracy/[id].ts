import { define } from "@/utils.ts";
import { buildLocationAccuracyBrief } from "@/lib/accuracy-brief.ts";
import {
  getAccuracyStats,
  getLocation,
  json,
  listVerifiedPairs,
} from "@/lib/db.ts";
import { errorJson } from "@/lib/db.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const location = await getLocation(ctx.params.id);
    if (!location) {
      return errorJson("Nie znaleziono lokalizacji.", 404);
    }

    const [stats, recentPairs] = await Promise.all([
      getAccuracyStats(location.id),
      listVerifiedPairs(15, location.id),
    ]);

    return json(
      buildLocationAccuracyBrief(
        location.id,
        location.name,
        stats,
        recentPairs,
      ),
      200,
      { "Cache-Control": "public, max-age=300" },
    );
  },
});
