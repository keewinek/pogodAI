# PogodAI

Najdokładniejsza pogoda pod słońcem — hiperlokalny werdykt AI po syntezie wielu
źródeł.

## Lokalnie

```bash
cp .env.example .env   # ustaw POGODAI_SECRET
deno task dev
```

## Produkcja (Deno Deploy)

1. [dash.deno.com](https://dash.deno.com) → New Project → GitHub → `pogodAI`
2. Framework preset: **Fresh** (wykrywany automatycznie z `deno.json`)
3. Env var: `POGODAI_SECRET` (`openssl rand -hex 32`)
4. Push na `main` = deploy produkcyjny

### Seed prognozy (test)

```bash
POGODAI_SECRET=twoj-sekret ./scripts/seed-forecast.sh https://TWOJ-URL.deno.dev
```

## Automatyzacja

Prompt dla Cursor Cloud Automation:
[`automation/PROMPT.md`](automation/PROMPT.md)\
Cron: `0 * * * *`

## Stack

Fresh 2 · Deno · Deno KV · Tailwind · Preact islands
