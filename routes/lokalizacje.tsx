import { define } from "../utils.ts";
import { DEFAULT_THEME } from "../lib/display.ts";
import { listLocations } from "../lib/db.ts";
import { LocationEditor } from "../islands/ui.tsx";

export const handler = define.handlers({
  async GET(ctx) {
    ctx.state.theme = DEFAULT_THEME;
    ctx.state.title = "PogodAI — Lokalizacje";
    return { data: { locations: await listLocations() } };
  },
});

export default define.page<typeof handler>(function LocationsPage({ data }) {
  return (
    <main class="max-w-md mx-auto px-5 pt-2 pb-12 flex flex-col gap-8 min-h-dvh">
      <header class="flex items-center gap-3">
        <a href="/" class="btn-ghost shrink-0 px-3" aria-label="Wróć">
          ← Wróć
        </a>
        <h1 class="text-[22px] font-semibold tracking-tight">Lokalizacje</h1>
      </header>
      <LocationEditor initialLocations={data.locations} />
    </main>
  );
});
