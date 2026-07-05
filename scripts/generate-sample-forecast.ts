/**
 * Generates a realistic 7-day sample forecast for warszawa-bialoleka.
 * Usage: deno run -A scripts/generate-sample-forecast.ts > Context/przyklad-forecast.json
 */

const locationId = "warszawa-bialoleka";

const dayProfiles = [
  {
    emoji: "🌧️",
    summary: "Deszczowo od południa — weź parasol.",
    min: 9,
    max: 15,
    precip: 70,
    wind: 18,
  },
  {
    emoji: "⛅",
    summary: "Przejaśnienia, lekki wiatr.",
    min: 11,
    max: 18,
    precip: 20,
    wind: 12,
  },
  {
    emoji: "☀️",
    summary: "Słonecznie przez cały dzień.",
    min: 13,
    max: 21,
    precip: 5,
    wind: 10,
  },
  {
    emoji: "☀️",
    summary: "Upalnie i sucho.",
    min: 15,
    max: 24,
    precip: 0,
    wind: 8,
  },
  {
    emoji: "🌤️",
    summary: "Większość dnia słonecznie.",
    min: 14,
    max: 22,
    precip: 10,
    wind: 11,
  },
  {
    emoji: "⛅",
    summary: "Zmienna chmurność, możliwe przelotne opady.",
    min: 12,
    max: 19,
    precip: 30,
    wind: 14,
  },
  {
    emoji: "🌧️",
    summary: "Deszcz od rana do popołudnia.",
    min: 10,
    max: 16,
    precip: 65,
    wind: 16,
  },
];

function warsawDate(offsetDays: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function buildHours(
  date: string,
  index: number,
  profile: typeof dayProfiles[0],
) {
  const step = index < 2 ? 1 : 3;
  const hours: Array<{
    time: string;
    emoji: string;
    temperature: number;
    precipitationChance: number;
    windKmh: number;
  }> = [];

  for (let h = 0; h < 24; h += step) {
    const progress = h / 23;
    const temp = Math.round(
      profile.min + (profile.max - profile.min) * Math.sin(progress * Math.PI),
    );
    const precip = Math.max(
      0,
      Math.min(100, profile.precip + (h < 8 ? 10 : h > 18 ? -5 : 0)),
    );
    const emoji = precip > 50 ? "🌧️" : precip > 20 ? "⛅" : "☀️";

    hours.push({
      time: `${date}T${String(h).padStart(2, "0")}:00`,
      emoji,
      temperature: temp,
      precipitationChance: precip,
      windKmh: profile.wind,
    });
  }

  return hours;
}

const forecast = {
  locationId,
  generatedAt: new Date().toISOString(),
  sources: ["open-meteo", "yr.no", "google", "tvn", "interia", "imgw"],
  verdict: {
    text: "Po południu rozpada się na dobre — weź parasol.",
    emoji: "🌧️",
    temperature: 14,
    feelsLike: 12,
    precipitationChance: 70,
    windKmh: 18,
  },
  days: dayProfiles.map((profile, index) => {
    const date = warsawDate(index);
    return {
      date,
      summary: profile.summary,
      emoji: profile.emoji,
      tempMin: profile.min,
      tempMax: profile.max,
      precipitationChance: profile.precip,
      windKmh: profile.wind,
      hours: buildHours(date, index, profile),
    };
  }),
};

console.log(JSON.stringify(forecast, null, 2));
