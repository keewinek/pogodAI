import { HttpError } from "fresh";
import { define } from "../utils.ts";
import { getForecast, getLocation, listLocations } from "../lib/db.ts";
import { DEFAULT_THEME, themeFor, warsawHour } from "../lib/theme.ts";
import { dayLabel, warsawToday } from "../lib/time.ts";
import { upcomingHours } from "../lib/forecast-utils.ts";
import { Hero } from "../components/Hero.tsx";
import { VerdictCard } from "../components/VerdictCard.tsx";
import { HourlyStrip } from "../components/HourlyStrip.tsx";
import { FreshnessFooter } from "../components/FreshnessFooter.tsx";
import LocationPicker from "../islands/LocationPicker.tsx";
import DailyAccordion from "../islands/DailyAccordion.tsx";

export const handler = define.handlers({
  async GET(ctx) {
    const location = await getLocation(ctx.params.location);
    if (!location) throw new HttpError(404);

    const [locations, forecast] = await Promise.all([
      listLocations(),
      getForecast(location.id),
    ]);

    ctx.state.theme = forecast
      ? themeFor(forecast.verdict.emoji, warsawHour())
      : DEFAULT_THEME;
    ctx.state.title = `PogodAI — ${location.name}`;

    return { data: { location, locations, forecast } };
  },
});

export default define.page<typeof handler>(function LocationPage({ data }) {
  const { location, locations, forecast } = data;
  const today = warsawToday();

  return (
    <main class="max-w-md mx-auto px-4 py-6 flex flex-col gap-5">
      <LocationPicker locations={locations} currentId={location.id} />

      {!forecast
        ? (
          <section class="rounded-3xl bg-white/15 backdrop-blur border border-white/20 p-8 text-center mt-8">
            <div class="text-5xl" aria-hidden="true">⏳</div>
            <p class="mt-4 text-lg font-medium">
              Czekam na pierwszą prognozę
            </p>
            <p class="mt-2 text-sm text-white/70">
              Nie mam jeszcze prognozy dla tej lokalizacji. Pojawi się w ciągu
              godziny. Wpadnij później!
            </p>
          </section>
        )
        : (
          <>
            <Hero verdict={forecast.verdict} />
            <VerdictCard verdict={forecast.verdict} />

            <section>
              <h2 class="text-sm font-semibold text-white/70 mb-2 px-1">
                Najbliższe godziny
              </h2>
              <HourlyStrip
                hours={upcomingHours(forecast.days, today, warsawHour())}
              />
            </section>

            <section>
              <h2 class="text-sm font-semibold text-white/70 mb-2 px-1">
                Prognoza na kolejne dni
              </h2>
              <DailyAccordion
                days={forecast.days}
                labels={forecast.days.map((d) => dayLabel(d.date, today))}
              />
            </section>

            <FreshnessFooter
              generatedAt={forecast.generatedAt}
              sources={forecast.sources}
            />
          </>
        )}
    </main>
  );
});
