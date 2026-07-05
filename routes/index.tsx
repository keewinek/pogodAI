import { Head } from "fresh/runtime";
import { page } from "fresh";
import { define } from "../utils.ts";
import { listLocations } from "../lib/db.ts";
import { WeatherLayout } from "../components/WeatherLayout.tsx";
import LocationGate from "../islands/LocationGate.tsx";

export const handler = define.handlers({
  async GET() {
    const locations = await listLocations();
    return page({ locations });
  },
});

export default define.page<typeof handler>(({ data }) => {
  const { locations } = data;

  return (
    <WeatherLayout theme="night">
      <Head>
        <title>PogodAI — Wybierz lokalizację</title>
        <meta name="theme-color" content="#1e1b4b" />
      </Head>

      {/* redirect z localStorage — bez UI */}
      <LocationGate locations={locations} />

      <header class="text-center pt-8 space-y-2">
        <div class="text-5xl" aria-hidden="true">🌦️</div>
        <h1 class="text-3xl font-light tracking-tight">PogodAI</h1>
        <p class="text-white/70 text-sm">
          Jedna prawdziwa prognoza z wielu źródeł
        </p>
      </header>

      <section class="space-y-3">
        <h2 class="text-center text-sm font-medium text-white/60 uppercase tracking-wider">
          Wybierz lokalizację
        </h2>
        <LocationGate locations={locations} showPicker />
      </section>

      {locations.length > 0 && (
        <p class="text-center pt-2">
          <a
            href="/lokalizacje"
            class="inline-flex min-h-11 items-center text-sm text-white/60 underline underline-offset-4 hover:text-white/80"
          >
            Edytuj lokalizacje…
          </a>
        </p>
      )}
    </WeatherLayout>
  );
});
