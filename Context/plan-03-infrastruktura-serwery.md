# PogodAI — Plan infrastruktury i serwerów

## 1. Przegląd

Infrastruktura celowo minimalna — dwa zarządzane serwisy, zero własnych
serwerów:

| Rola                               | Usługa                                                  | Koszt                        |
| ---------------------------------- | ------------------------------------------------------- | ---------------------------- |
| Hosting aplikacji (SSR + API)      | **Deno Deploy**                                         | darmowy tier wystarczy       |
| Baza danych                        | **Deno KV** (wbudowane w Deno Deploy)                   | darmowy tier wystarczy       |
| Cron + agent AI (scraping/synteza) | **Cursor Cloud Automations**                            | w ramach subskrypcji Cursora |
| Proxy do scrapingu                 | **r.jina.ai** (Jina Reader)                             | darmowe, bez klucza          |
| Repozytorium + deploy              | **GitHub → Deno Deploy** (auto-deploy z brancha `main`) | darmowe                      |

Brak: własnych VPS-ów, Dockera, płatnych API pogodowych, płatnych API LLM.

## 2. Deno Deploy

### 2.1 Konfiguracja projektu

- Projekt Deno Deploy podpięty do tego repo GitHub (integracja "GitHub
  Automatic").
- Framework preset: **Fresh 2 (Vite build)** — Deno Deploy buduje `vite build` i
  serwuje `main.ts`.
- Branch produkcyjny: `main`. Każdy push na `main` = automatyczny deploy
  produkcyjny; inne branche dostają preview deployments.
- Region: automatyczny (edge). KV jest replikowane globalnie przez Deno Deploy —
  nic nie konfigurujemy.

### 2.2 Zmienne środowiskowe (Deno Deploy → Settings → Environment Variables)

Brak wymaganych zmiennych — aplikacja prywatna, bez autoryzacji API.

Lokalne dev: brak pliku `.env`.

### 2.3 Domena

- Start: domyślna `https://pogodai.deno.dev` (lub podobna dostępna nazwa).
- Opcjonalnie później: własna domena podpięta w panelu Deno Deploy (darmowy TLS
  automatycznie).

## 3. Deno KV

- Otwarcie: `await Deno.openKv()` — na Deploy łączy się z zarządzanym KV
  projektu, lokalnie tworzy plik SQLite.
- Model danych i klucze: patrz `plan-00-przeglad.md` §5.
- Rozmiar wartości KV: limit 64 KiB — prognoza 7-dniowa (JSON ~2–4 KiB) mieści
  się z ogromnym zapasem.
- Brak historii → brak potrzeby sprzątania/TTL. Liczba kluczy = liczba
  lokalizacji + 1.
- **Seed:** przy pierwszym uruchomieniu, jeśli `["locations"]` puste, zapisujemy
  domyślną lokalizację Białołęka (52.32, 20.97).
- Backup: przy tej skali zbędny; lista lokalizacji odtwarzalna ręcznie w minutę,
  prognozy regenerują się co godzinę same.

## 4. Cursor Cloud Automations

- Jedna automatyzacja: **"PogodAI — aktualizacja prognoz"**.
- Harmonogram: cron `0 * * * *` (co godzinę, o pełnej godzinie).
- Agent nie potrzebuje dostępu do repo (działa na HTTP: Jina Reader → synteza →
  curl POST). Szczegóły prompta i przepływu: `plan-05-automatyzacja-agent.md`.

## 5. Środowiska

| Środowisko  | Jak                               | Uwagi                                                            |
| ----------- | --------------------------------- | ---------------------------------------------------------------- |
| Lokalne dev | `deno task dev` (Vite dev server) | KV lokalny (SQLite)                                              |
| Preview     | push na branch ≠ main             | osobny URL, współdzieli KV projektu — uwaga przy testach mutacji |
| Produkcja   | push na `main`                    | jedyne środowisko z automatyzacją                                |

Test lokalny POST-a:

```bash
curl -X POST http://localhost:8000/api/forecast \
  -H "Content-Type: application/json" \
  -d @Context/przyklad-forecast.json
```

## 6. Bezpieczeństwo

- **API bez autoryzacji** — aplikacja prywatna, nieindeksowana; ochrona przez
  obscurity URL + brak linków publicznych.
- `robots.txt`: `Disallow: /` — nie chcemy indeksacji prywatnej apki.
- Walidacja wejścia POST (kształt JSON, zakresy liczb) — chroni KV przed
  śmieciowymi danymi.
- HTTPS wymuszone przez Deno Deploy (zawsze TLS).
- Rate limiting: zbędny przy tej skali; Deno Deploy free tier i tak ma limity.

## 7. Monitoring i niezawodność

- **Świeżość jako monitoring:** frontend pokazuje wiek danych (patrz plan UX §3)
  — to nasz "alerting" (człowiek zauważy, że automatyzacja padła).
- Logi: panel Deno Deploy (logi runtime) + historia przebiegów w Cursor
  Automations.
- Tryb degradacji: gdy automatyzacja nie działa, strona dalej serwuje ostatnią
  prognozę z KV z ostrzeżeniem o wieku — brak twardej awarii.
- Health check: `GET /api/health` zwraca
  `{ ok: true, locations: n, newestForecastAt: ... }` — przydatne do szybkiej
  diagnostyki (i mógłby go pingować zewnętrzny uptime monitor, opcjonalnie).

## 8. Koszty — podsumowanie

Całość mieści się w darmowych tierach: Deno Deploy (requesty:
kilkadziesiąt/dzień od automatyzacji + użycie osobiste), KV (kilkanaście
kluczy), Jina Reader (darmowy), Cursor Automations (subskrypcja już opłacona).
**Koszt dodatkowy: 0 zł/mies.**
