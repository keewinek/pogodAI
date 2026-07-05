import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import { listLocations } from "../lib/db.ts";
import { WeatherLayout } from "../components/WeatherLayout.tsx";
import LocationGate from "../islands/LocationGate.tsx";

export default define.page(async function NotFound() {
  const locations = await listLocations();

  return (
    <WeatherLayout theme="night">
      <Head>
        <title>Nie znaleziono — PogodAI</title>
      </Head>

      <LocationGate locations={locations} clearInvalid />

      <div class="text-center space-y-4 py-8">
        <div class="text-5xl" aria-hidden="true">🌫️</div>
        <h1 class="text-2xl font-medium">Nie znaleziono lokalizacji</h1>
        <p class="text-white/70">
          Ta lokalizacja nie istnieje lub została usunięta.
        </p>
        <a
          href="/"
          class="inline-flex min-h-11 items-center justify-center rounded-2xl bg-white/20 px-6 py-3 font-medium"
        >
          Wybierz lokalizację
        </a>
      </div>
    </WeatherLayout>
  );
});
