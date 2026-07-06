# PogodAI — kontekst projektu

Osobista, hiperlokalna pogoda: **Cursor Cloud Automation** co godzinę uruchamia
**subagenta na każdą lokalizację**; subagent zbiera dane z wielu źródeł, składa
JSON i zapisuje przez `POST /api/forecast`. Aplikacja (Fresh + Deno KV) tylko
wyświetla wynik.

## Architektura

```
Orkiestrator (cron) → subagent × lokalizacja → POST /api/forecast → Deno KV → Fresh (SSR)
```

| Plik                            | Rola                                                         |
| ------------------------------- | ------------------------------------------------------------ |
| `automation/PROMPT.md`          | Orkiestrator — pobiera lokalizacje, uruchamia Task/subagenta |
| `automation/LOCATION_PROMPT.md` | Subagent — deep research + POST dla jednej lokalizacji       |
| `automation/VERIFY_PROMPT.md`   | Weryfikacja sprawdzalności (+15 min po pełnej)               |

## API

| Metoda | Ścieżka                     |
| ------ | --------------------------- |
| GET    | `/api/locations`            |
| POST   | `/api/locations`            |
| DELETE | `/api/locations/:id`        |
| GET    | `/api/locations/:id`        |
| GET    | `/api/forecast/:locationId` |
| GET    | `/api/forecast/status`      |
| POST   | `/api/forecast`             |
| GET    | `/api/health`               |

## Strony

- `/` — wybór lokalizacji (redirect z `localStorage`)
- `/[lokalizacja]` — prognoza
- `/lokalizacje` — dodaj/usuń lokalizacje (nazwa + lat + lon)

## Automatyzacja

- Orkiestrator: `automation/PROMPT.md` (cron `0 * * * *`, wymaga dostępu do
  repo)
- Subagent: `automation/LOCATION_PROMPT.md` (jedna lokalizacja na Task)
- Weryfikacja: `automation/VERIFY_PROMPT.md` (cron `15 * * * *`)

## Infrastruktura

- Deno Deploy + Deno KV (baza przypisana do aplikacji w panelu)
- Brak auth, brak płatnych API — scraping przez `r.jina.ai`
- Deploy: push na `main`
