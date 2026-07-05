import { define } from "../utils.ts";

export default define.page(function App({ Component }) {
  return (
    <html lang="pl">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta
          name="description"
          content="PogodAI — hiperlokalna prognoza pogody z werdyktem AI po syntezie wielu źródeł."
        />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="PogodAI" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <link rel="manifest" href="/manifest.json" />
        <title>PogodAI</title>
      </head>
      <body class="antialiased">
        <Component />
      </body>
    </html>
  );
});
