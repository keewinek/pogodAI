import { Head } from "fresh/runtime";
import { HttpError, page } from "fresh";
import { define } from "../utils.ts";
import { getForecast, listLocations } from "../lib/db.ts";
import { getNearestHours } from "../lib/forecast-utils.ts";
import { isLightTheme, resolveTheme, THEME_COLORS } from "../lib/theme.ts";
import { WeatherLayout } from "../components/WeatherLayout.tsx";
import { Hero, WaitingHero } from "../components/Hero.tsx";
import { VerdictCard } from "../components/VerdictCard.tsx";
import { HourlyStrip } from "../components/HourlyStrip.tsx";
import { FreshnessFooter } from "../components/FreshnessFooter.tsx";
import LocationPicker from "../islands/LocationPicker.tsx";
import DailyAccordion from "../islands/DailyAccordion.tsx";

export const handler = define.handlers({
  async GET(ctx) {
    const locationId = ctx.params.location;
    const locations = await listLocations();
    const location = locations.find((item) => item.id === locationId);

    if (!location) {
      throw new HttpError(404);
    }

    const forecast = await getForecast(locationId);
    const theme = resolveTheme(forecast?.verdict.emoji ?? "⛅");

    return page({ location, forecast, locations, theme });
  },
});

export default define.page<typeof handler>(({ data }) => {
  const { location, forecast, locations, theme } = data;
  const nearestHours = forecast ? getNearestHours(forecast.days) : [];
  const sectionLabel = isLightTheme(theme) ? "text-slate-600" : "text-white/80";

  return (
    <WeatherLayout theme={theme}>
      <Head>
        <title>{location.name} — PogodAI</title>
        <meta name="theme-color" content={THEME_COLORS[theme]} />
      </Head>

      <div class="flex justify-center">
        <LocationPicker
          locations={locations}
          currentId={location.id}
          currentName={location.name}
        />
      </div>

      {forecast
        ? (
          <>
            <Hero
              emoji={forecast.verdict.emoji}
              temperature={forecast.verdict.temperature}
              feelsLike={forecast.verdict.feelsLike}
              windKmh={forecast.verdict.windKmh}
              theme={theme}
            />

            <VerdictCard
              text={forecast.verdict.text}
              precipitationChance={forecast.verdict.precipitationChance}
              theme={theme}
            />

            {nearestHours.length > 0 && (
              <section class="space-y-3">
                <h2 class={`text-sm font-medium ${sectionLabel}`}>
                  Najbliższe godziny
                </h2>
                <HourlyStrip hours={nearestHours} theme={theme} />
              </section>
            )}

            <section class="space-y-3">
              <h2 class={`text-sm font-medium ${sectionLabel}`}>
                Prognoza na kolejne dni
              </h2>
              <DailyAccordion days={forecast.days} theme={theme} />
            </section>

            <FreshnessFooter
              generatedAt={forecast.generatedAt}
              sources={forecast.sources}
              theme={theme}
            />
          </>
        )
        : <WaitingHero theme={theme} />}
    </WeatherLayout>
  );
});
