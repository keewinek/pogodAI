import type { ComponentChildren } from "preact";
import {
  isLightTheme,
  THEME_GRADIENTS,
  type WeatherTheme,
} from "../lib/theme.ts";

interface WeatherLayoutProps {
  theme: WeatherTheme;
  children: ComponentChildren;
}

export function WeatherLayout({ theme, children }: WeatherLayoutProps) {
  const light = isLightTheme(theme);
  const textClass = light ? "text-slate-900" : "text-white";

  return (
    <div
      class={`min-h-screen bg-gradient-to-b ${
        THEME_GRADIENTS[theme]
      } ${textClass} px-4 py-6`}
    >
      <div class="max-w-md mx-auto space-y-6">{children}</div>
    </div>
  );
}

export function cardClass(light: boolean): string {
  return light
    ? "bg-white/70 backdrop-blur rounded-3xl shadow-lg"
    : "bg-white/10 backdrop-blur rounded-3xl shadow-lg";
}
