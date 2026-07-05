import { Head } from "fresh/runtime";
import { page } from "fresh";
import { define } from "../utils.ts";
import { listLocations } from "../lib/db.ts";
import { WeatherLayout } from "../components/WeatherLayout.tsx";
import LocationEditor from "../islands/LocationEditor.tsx";

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
        <title>Lokalizacje — PogodAI</title>
      </Head>

      <header class="flex items-center gap-3">
        <a
          href="/"
          class="min-h-11 min-w-11 inline-flex items-center justify-center rounded-2xl bg-white/10 text-lg"
          aria-label="Wróć"
        >
          ←
        </a>
        <h1 class="text-2xl font-medium">Lokalizacje</h1>
      </header>

      <LocationEditor initialLocations={locations} />
    </WeatherLayout>
  );
});
