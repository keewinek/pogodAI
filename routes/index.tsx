import { define } from "../utils.ts";
import { listLocations } from "../lib/db.ts";
import { DEFAULT_THEME } from "../lib/theme.ts";
import LocationGate from "../islands/LocationGate.tsx";

export const handler = define.handlers({
  async GET(ctx) {
    ctx.state.theme = DEFAULT_THEME;
    ctx.state.title = "PogodAI";
    const locations = await listLocations();
    return { data: { locations } };
  },
});

export default define.page<typeof handler>(function Home({ data }) {
  return (
    <main class="max-w-md mx-auto px-5 pt-20 pb-12 flex flex-col gap-10 min-h-dvh justify-center">
      <header class="text-center">
        <div class="wordmark mx-auto" aria-hidden="true">⛅</div>
        <h1 class="text-[34px] font-semibold tracking-tight">PogodAI</h1>
        <p class="mt-2 text-[17px] muted">Jedna prognoza z wielu źródeł</p>
      </header>

      <LocationGate locations={data.locations} />

      <p class="text-center pt-2">
        <a href="/lokalizacje" class="btn-ghost inline-flex items-center gap-2">
          Edytuj lokalizacje
          <span class="chevron" aria-hidden="true" />
        </a>
      </p>
    </main>
  );
});
