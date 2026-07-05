import type { Verdict } from "./types.ts";
import { clamp, round } from "./weather-code.ts";

/** Werdykt po polsku — wyłącznie reguły, bez LLM. */
export function buildVerdict(
  emoji: string,
  temperature: number,
  feelsLike: number,
  precipitationChance: number,
  windKmh: number,
  sourceCount: number,
): Verdict {
  const temp = round(temperature);
  const feels = round(feelsLike);
  const precip = clamp(round(precipitationChance), 0, 100);
  const wind = clamp(round(windKmh), 0, 300);

  let text: string;
  if (precip >= 70) {
    text = "Deszczowo — weź parasol na zewnątrz.";
  } else if (precip >= 45) {
    text = "Możliwe przelotne opady — miej kurtkę pod ręką.";
  } else if (temp <= 3) {
    text = "Mróz na dworze — ubierz się ciepło.";
  } else if (temp <= 8) {
    text = "Chłodno — weź warstwę więcej niż wydaje się potrzebna.";
  } else if (temp >= 30) {
    text = "Upał — pij wodę i unikaj słońca w południe.";
  } else if (wind >= 45) {
    text = "Wieje mocno — uważaj na podmuchy.";
  } else if (precip <= 15 && temp >= 18) {
    text = "Sucho i przyjemnie — spokojny dzień na dworze.";
  } else {
    text = "Zmienna pogoda, ale bez ekstremów — standardowa warstwa wystarczy.";
  }

  if (sourceCount < 5) {
    text +=
      " (Mało źródeł online — werdykt oparty głównie na modelach numerycznych.)";
  }

  if (text.length > 300) text = text.slice(0, 297) + "…";

  return {
    text,
    emoji,
    temperature: temp,
    feelsLike: feels,
    precipitationChance: precip,
    windKmh: wind,
  };
}

export function buildDaySummary(
  emoji: string,
  tempMin: number,
  tempMax: number,
  precip: number,
): string {
  const min = round(tempMin);
  const max = round(tempMax);
  const p = clamp(round(precip), 0, 100);
  if (p >= 60) {
    return `${emoji} Od ${min}° do ${max}° — deszczowo, weź parasol.`;
  }
  if (p >= 30) {
    return `${emoji} ${min}–${max}° — miejscami opady, pogoda kapryśna.`;
  }
  if (max >= 25) {
    return `${emoji} Ciepło ${min}–${max}° — dużo słońca, mało opadów.`;
  }
  return `${emoji} ${min}–${max}° — spokojnie, opady do ${p}%.`;
}
