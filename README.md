# PogodAI 🌦️

Hiperlokalna prognoza pogody. **Cursor Cloud Automation** co godzinę zbiera dane
z wielu źródeł, składa JSON i zapisuje go przez `POST /api/forecast`. Frontend
czyta prognozę z Deno KV.

Prod: **https://pogodai.keewinek.deno.net/**

```
Cursor Automation (orkiestrator, cron)
  → subagent × lokalizacja → POST /api/forecast → Deno KV → Fresh
```

- Orkiestrator: `automation/PROMPT.md` (cron `0 * * * *`)
- Subagent: `automation/LOCATION_PROMPT.md` (jedna lokalizacja)
- Kontekst: `Context/README.md`

## API

| Metoda | Ścieżka                     | Opis                           |
| ------ | --------------------------- | ------------------------------ |
| GET    | `/api/locations`            | Lista lokalizacji              |
| POST   | `/api/locations`            | Dodaj lokalizację              |
| DELETE | `/api/locations/:id`        | Usuń lokalizację (+ prognozę)  |
| GET    | `/api/forecast/:locationId` | Prognoza dla lokalizacji       |
| GET    | `/api/forecast/status`      | Status prognoz (orkiestrator)  |
| GET    | `/api/accuracy`             | Sprawdzalność globalna (agent) |
| GET    | `/api/accuracy/:locationId` | Sprawdzalność + hints (agent)  |
| POST   | `/api/forecast`             | Zapis prognozy (subagent)      |
| GET    | `/api/health`               | Status systemu                 |

## Development

```bash
deno task dev      # dev server
deno task check    # fmt + lint + typy
deno task build    # build produkcyjny
deno task start    # serwuj build (port 8000)
```

## Deploy

Push na `main` → Deno Deploy. W panelu: Databases → Deno KV → Assign do
`pogodai`.

Prognozy wyłącznie z Cursor Automation — orkiestrator (`automation/PROMPT.md`,
cron `0 * * * *`) uruchamia subagenta na każdą lokalizację wg
`automation/LOCATION_PROMPT.md`.
