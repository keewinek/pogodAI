import { HttpError } from "fresh";
import { define } from "../utils.ts";
import {
  getForecast,
  getGlobalAccuracyStats,
  getLocation,
  listLocations,
} from "../lib/db.ts";
import {
  dayDateLabel,
  DEFAULT_THEME,
  themeFor,
  upcomingHours,
  warsawHour,
  warsawToday,
} from "../lib/display.ts";
import {
  FreshnessFooter,
  Hero,
  HourlyStrip,
  VerdictCard,
} from "../components/forecast.tsx";
import { RainRadar } from "../islands/RainRadar.tsx";
import { DailyAccordion, LocationPicker } from "../islands/ui.tsx";
import { PRELIMINARY_PAIR_THRESHOLD } from "../lib/verification.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const location = await getLocation(ctx.params.location);
    if (!location) throw new HttpError(404);

    const [locations, forecast, accuracyStats] = await Promise.all([
      listLocations(),
      getForecast(location.id),
      getGlobalAccuracyStats(),
    ]);

    ctx.state.theme = forecast
      ? themeFor(forecast.verdict.emoji, warsawHour())
      : DEFAULT_THEME;
    ctx.state.title = `PogodAI — ${location.name}`;

    return { data: { location, locations, forecast, accuracyStats } };
  },
});

export default define.page<typeof handler>(function LocationPage({ data }) {
  const { location, locations, forecast, accuracyStats } = data;
  const today = warsawToday();

  return (
    <main class="max-w-md mx-auto px-5 pb-10 flex flex-col gap-6 min-h-dvh">
      <LocationPicker locations={locations} currentId={location.id} />

      {!forecast
        ? (
          <section class="px-2 py-14 text-center mt-4">
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
            <Hero verdict={forecast.verdict} hour={warsawHour()} />
            <VerdictCard
              verdict={forecast.verdict}
              accuracy={accuracyStats.totalPairs > 0
                ? accuracyStats.overallAccuracy
                : null}
              preliminary={accuracyStats.totalPairs > 0 &&
                accuracyStats.totalPairs < PRELIMINARY_PAIR_THRESHOLD}
            />
            <section>
              <h2 class="section-label">Godzinowa</h2>
              <HourlyStrip
                hours={upcomingHours(forecast.days, today, warsawHour())}
              />
            </section>
            <section>
              <h2 class="section-label">
                {forecast.days.length === 14
                  ? "14 dni"
                  : `${forecast.days.length} dni`}
              </h2>
              <DailyAccordion
                days={forecast.days}
                todayDate={today}
                labels={forecast.days.map((d) => dayDateLabel(d.date))}
              />
            </section>
            <section>
              <h2 class="section-label">Radar opadów</h2>
              <RainRadar lat={location.lat} lon={location.lon} />
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
