import { define } from "../utils.ts";
import { listLocations } from "../lib/db.ts";
import { DEFAULT_THEME } from "../lib/theme.ts";
import LocationGate from "../islands/LocationGate.tsx";

export const handler = define.handlers({
  async GET(ctx) {
    ctx.state.theme = DEFAULT_THEME;
    ctx.state.title = "PogodAI — wybierz lokalizację";
    const locations = await listLocations();
    return { data: { locations } };
  },
});

export default define.page<typeof handler>(function Home({ data }) {
  return (
    <main class="max-w-md mx-auto px-4 py-12 flex flex-col gap-8">
      <header class="text-center">
        <h1 class="text-4xl font-bold">PogodAI 🌦️</h1>
        <p class="mt-2 text-white/70">Wybierz lokalizację</p>
      </header>

      <LocationGate locations={data.locations} />

      <p class="text-center">
        <a
          href="/lokalizacje"
          class="text-sm text-white/60 underline underline-offset-4 hover:text-white/90 transition"
        >
          Edytuj lokalizacje…
        </a>
      </p>
    </main>
  );
});
