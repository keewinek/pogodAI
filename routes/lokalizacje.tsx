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
    <main class="max-w-md mx-auto px-4 py-8 flex flex-col gap-6">
      <header class="flex items-center gap-3">
        <a
          href="/"
          aria-label="Wróć do wyboru lokalizacji"
          class="rounded-full bg-white/15 px-3.5 py-2 hover:bg-white/25 transition min-h-11 flex items-center"
        >
          ←
        </a>
        <h1 class="text-2xl font-bold">Lokalizacje</h1>
      </header>

      <LocationEditor initialLocations={data.locations} />
    </main>
  );
});
