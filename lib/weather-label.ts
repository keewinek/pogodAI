/** Krótka etykieta warunków po emoji (jak w aplikacji Pogoda). */
export function conditionLabel(emoji: string): string {
  if (emoji.includes("⛈") || emoji.includes("🌩")) return "Burza";
  if (emoji.includes("🌧") || emoji.includes("☔")) return "Deszcz";
  if (emoji.includes("🌦")) return "Przelotne opady";
  if (emoji.includes("🌨") || emoji.includes("❄")) return "Śnieg";
  if (emoji.includes("🌫")) return "Mgła";
  if (emoji.includes("💨")) return "Wietrznie";
  if (emoji.includes("☀")) return "Słonecznie";
  if (emoji.includes("🌤")) return "Lekko zachmurzone";
  if (emoji.includes("⛅")) return "Pochmurno";
  if (emoji.includes("☁")) return "Zachmurzenie";
  return "Pogoda";
}
