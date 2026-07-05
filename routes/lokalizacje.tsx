import { define } from "../utils.ts";
import { listLocations } from "../lib/db.ts";
import { DEFAULT_THEME } from "../lib/theme.ts";
import LocationEditor from "../islands/LocationEditor.tsx";

export const handler = define.handlers({
  async GET(ctx) {
    ctx.state.theme = DEFAULT_THEME;
    ctx.state.title = "PogodAI — lokalizacje";
    const locations = await listLocations();
    return { data: { locations } };
  },
});

export default define.page<typeof handler>(function Lokalizacje({ data }) {
  return (
    <main class="max-w-md mx-auto px-5 pt-4 pb-12 flex flex-col gap-8">
      <header class="flex items-center gap-3 pt-2">
        <a
          href="/"
          aria-label="Wróć"
          class="btn-ghost flex items-center justify-center w-11 h-11 p-0 rounded-full bg-white/8"
        >
          <span
            class="chevron rotate-[135deg] -mr-0.5"
            aria-hidden="true"
          />
        </a>
        <h1 class="text-[28px] font-semibold tracking-tight">Lokalizacje</h1>
      </header>

      <LocationEditor initialLocations={data.locations} />
    </main>
  );
});
