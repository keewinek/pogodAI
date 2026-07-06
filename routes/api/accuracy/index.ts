import { define } from "@/utils.ts";
import { buildGlobalAccuracyBrief } from "@/lib/accuracy-brief.ts";
import {
  getAccuracyStats,
  getGlobalAccuracyStats,
  json,
  listLocations,
} from "@/lib/db.ts";

export const handler = define.handlers({
  async GET() {
    const [global, locations] = await Promise.all([
      getGlobalAccuracyStats(),
      listLocations(),
    ]);

    const withStats = await Promise.all(
      locations.map(async (loc) => ({
        id: loc.id,
        name: loc.name,
        stats: await getAccuracyStats(loc.id),
      })),
    );

    return json(buildGlobalAccuracyBrief(global, withStats), 200, {
      "Cache-Control": "public, max-age=300",
    });
  },
});
