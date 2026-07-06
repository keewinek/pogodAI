# PogodAI 🌦️

Hiperlokalna prognoza pogody. **Cursor Cloud Automation** co godzinę zbiera dane
z wielu źródeł, składa JSON i zapisuje go przez `POST /api/forecast`. Frontend
czyta prognozę z Deno KV.

Prod: **https://pogodai.keewinek.deno.net/**

```
Cursor Automation (cron) → POST /api/forecast → Deno KV → Fresh
```

- Prompt: `automation/PROMPT.md`
- Kontekst: `Context/README.md`

## API

| Metoda | Ścieżka                     | Opis                           |
| ------ | --------------------------- | ------------------------------ |
| GET    | `/api/locations`            | Lista lokalizacji              |
| POST   | `/api/locations`            | Dodaj lokalizację              |
| DELETE | `/api/locations/:id`        | Usuń lokalizację (+ prognozę)  |
| GET    | `/api/forecast/:locationId` | Prognoza dla lokalizacji       |
| POST   | `/api/forecast`             | Zapis prognozy (automatyzacja) |
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

Prognozy wyłącznie z Cursor Automation (`automation/PROMPT.md`, cron
`0 * * * *`).
