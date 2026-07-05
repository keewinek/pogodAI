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
    <main class="max-w-md mx-auto px-5 pb-8 flex flex-col gap-8 min-h-dvh">
      <LocationPicker locations={locations} currentId={location.id} />

      {!forecast
        ? (
          <section class="grouped px-6 py-14 text-center mt-4">
            <div class="empty-ring" aria-hidden="true" />
            <p class="text-[20px] font-semibold tracking-tight">
              Czekam na prognozę
            </p>
            <p class="mt-3 text-[15px] muted leading-relaxed max-w-[15rem] mx-auto">
              Pojawi się w ciągu godziny po uruchomieniu automatyzacji.
            </p>
          </section>
        )
        : (
          <>
            <Hero verdict={forecast.verdict} />
            <VerdictCard verdict={forecast.verdict} />

            <section>
              <h2 class="section-label">Godzinowa</h2>
              <HourlyStrip
                hours={upcomingHours(forecast.days, today, warsawHour())}
              />
            </section>

            <section>
              <h2 class="section-label">7 dni</h2>
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
