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
      </Head>

      <header class="text-center pt-4 space-y-2">
        <h1 class="text-4xl font-light">PogodAI 🌦️</h1>
        <p class="text-white/70">Wybierz lokalizację</p>
      </header>

      <LocationGate locations={locations} showPicker />

      {locations.length > 0 && (
        <p class="text-center">
          <a
            href="/lokalizacje"
            class="text-sm text-white/60 underline underline-offset-4"
          >
            Edytuj lokalizacje…
          </a>
        </p>
      )}
    </WeatherLayout>
  );
});
