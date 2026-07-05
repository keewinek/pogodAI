import { define } from "../utils.ts";
import { DEFAULT_THEME } from "../lib/theme.ts";

export default define.page(function App({ Component, state }) {
  const theme = state.theme ?? DEFAULT_THEME;
  return (
    <html lang="pl">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content={theme.themeColor} />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <link rel="manifest" href="/manifest.json" />
        <title>{state.title ?? "PogodAI"}</title>
      </head>
      <body
        class={`text-white antialiased ${theme.gradient}`}
        data-theme={theme.name}
      >
        <div class="app-shell">
          <div class="app-ambient" aria-hidden="true" />
          <div class="app-content">
            <Component />
          </div>
        </div>
      </body>
    </html>
  );
});
