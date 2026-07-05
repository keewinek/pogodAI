import type { ComponentChildren } from "preact";
import {
  isLightTheme,
  THEME_GRADIENTS,
  type WeatherTheme,
} from "../lib/theme.ts";

interface WeatherLayoutProps {
  theme: WeatherTheme;
  children: ComponentChildren;
  compact?: boolean;
}

export function WeatherLayout(
  { theme, children, compact = false }: WeatherLayoutProps,
) {
  const light = isLightTheme(theme);
  const textClass = light ? "text-slate-900" : "text-white";

  return (
    <div
      class={`min-h-[100dvh] bg-gradient-to-b ${
        THEME_GRADIENTS[theme]
      } ${textClass} px-4 py-4 sm:py-6`}
    >
      <div class={`max-w-md mx-auto ${compact ? "space-y-4" : "space-y-5"}`}>
        {children}
      </div>
    </div>
  );
}

export function cardClass(light: boolean): string {
  return light
    ? "bg-white/75 backdrop-blur-md rounded-3xl shadow-lg border border-white/50"
    : "bg-white/10 backdrop-blur-md rounded-3xl shadow-lg border border-white/10";
}

export function pillClass(light: boolean): string {
  return light
    ? "bg-white/80 text-slate-900 border border-white/60"
    : "bg-white/15 text-white border border-white/10";
}
