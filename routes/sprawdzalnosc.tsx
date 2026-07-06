import { define } from "../utils.ts";
import { DEFAULT_THEME } from "../lib/display.ts";
import {
  getAllLocationAccuracyStats,
  getGlobalAccuracyStats,
  listLocations,
  listVerifiedPairs,
} from "../lib/db.ts";
import { AccuracyPageContent } from "../components/accuracy.tsx";

export const handler = define.handlers({
  async GET(ctx) {
    ctx.state.theme = DEFAULT_THEME;
    ctx.state.title = "PogodAI — Sprawdzalność";

    const [globalStats, locations, verifiedPairs, locationStatsRaw] =
      await Promise.all([
        getGlobalAccuracyStats(),
        listLocations(),
        listVerifiedPairs(50),
        getAllLocationAccuracyStats(),
      ]);

    const locationMap = new Map(locations.map((l) => [l.id, l]));
    const locationStats = locationStatsRaw
      .map(({ locationId, stats }) => {
        const location = locationMap.get(locationId);
        return location ? { location, stats } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    return {
      data: {
        globalStats,
        locationStats,
        verifiedPairs,
        locations,
      },
    };
  },
});

export default define.page<typeof handler>(
  function SprawdzalnoscPage({ data }) {
    const backHref = data.locations.length > 0
      ? `/${data.locations[0].id}`
      : "/";

    return (
      <main class="max-w-md mx-auto px-5 pt-2 pb-12 flex flex-col gap-8 min-h-dvh">
        <div class="flex items-center gap-3">
          <a href={backHref} class="btn-ghost shrink-0 px-3" aria-label="Wróć">
            ← Wróć
          </a>
        </div>
        <AccuracyPageContent
          globalStats={data.globalStats}
          locationStats={data.locationStats}
          verifiedPairs={data.verifiedPairs}
          locations={data.locations}
        />
      </main>
    );
  },
);
