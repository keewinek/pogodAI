# PogodAI — subagent: prognoza dla jednej lokalizacji

Orkiestrator (`automation/PROMPT.md`) uruchamia **osobny subagent** na każdą
lokalizację. Ten plik to pełna specyfikacja pracy subagenta.

## Lokalizacja (z promptu orkiestratora)

```json
{ "id": "<locationId>", "name": "<nazwa>", "lat": 0.0, "lon": 0.0 }
```

- `id` → pole `locationId` w JSON prognozy
- `name` → wyszukiwania („pogoda {name}”), weryfikacja że źródło dotyczy tej
  miejscowości
- `lat`, `lon` → endpointy API (min. 2 miejsca po przecinku)

## Cel

**Najbardziej prawdopodobna** prognoza — synteza wielu niezależnych źródeł, nie
kopia jednego serwisu.

## Pipeline (kolejność obowiązkowa)

### Faza 1 — Szkielet numeryczny (najpierw)

1. **Open-Meteo** multi-model (ICON + GFS + ECMWF) — godzinówka i daily na 14
   dni.
2. **YR.no** — porównanie, lokalne odchylenia.
3. **IMGW** (jeśli Polska) — komunikaty, ostrzeżenia, dane stacji.

Z Open-Meteo **nie wymyślaj** godzin ręcznie — to baza `hours[]` i pól
dziennych.

### Faza 2 — Agregatory i redakcja

Przez `https://r.jina.ai/<url>` lub tanie API: TVN Meteo, Interia, Onet, WP,
meteo.pl, AccuWeather, Weather.com, Meteoblue, Foreca, MSN Pogoda, Google
(`pogoda {name}`), WetterOnline.

### Faza 3 — Synteza

- **Konsensus** (mediana / większość) dla temp, opadów, wiatru.
- **Rozbieżności:** oceń wiarygodność (front → IMGW + ECMWF; antycyklon →
  zgodność modeli).
- **Prawdopodobieństwa** opadów/burz/mgły → `precipitationChance` + werdykt.
- Cel: **≥ 15** faktycznie użytych źródeł, docelowo **~30**.
- W `sources` tylko źródła, z których wziąłeś liczby (`open-meteo-icon`,
  `open-meteo-gfs`, `open-meteo-ecmwf`, `yr.no`, `imgw`, domeny WWW).

**Zakaz:** fora, social media, paywalle, źródła bez liczb dla tej miejscowości.

### Faza 4 — JSON + POST

Zbuduj payload, przejdź checklistę, wyślij.

## Werdykt (`verdict`)

| Pole                             | Skąd                                                      |
| -------------------------------- | --------------------------------------------------------- |
| `text`                           | Max 3 zdania PL, ≤ 300 znaków (walidator odrzuca dłuższe) |
| `emoji`                          | Ikona bieżącej sytuacji (hierarchia poniżej)              |
| `temperature`, `feelsLike`       | Open-Meteo `current` lub najbliższa godzina               |
| `precipitationChance`, `windKmh` | Zgodnie z najbliższą godziną / konsensusem                |

**Struktura `text`:**

1. Werdykt praktyczny — co będzie, co zrobić. 2.–3. Uzasadnienie — modele,
   liczba zgodnych źródeł, ewentualna niepewność.

Przy < 10 źródłach — napisz w werdykcie, że pewność jest niższa.

## Budowa `days[]` i `hours[]`

**Strefa:** `Europe/Warsaw`. Dzień `[0]` = dziś wg Warszawy (nie UTC).

| Indeks dnia  | Zakres godzin | Interwał | Liczba wpisów |
| ------------ | ------------- | -------- | ------------- |
| `[0]`–`[2]`  | 00:00–23:00   | co 1 h   | **24**        |
| `[3]`–`[13]` | 00,03,…,21    | co 3 h   | **8**         |

- Łącznie **14** elementów w `days[]`.
- `days[i].date` — kolejne daty YYYY-MM-DD od dziś (Warszawa).
- `hours[j].time` musi zaczynać się od `days[i].date` (inaczej 400).
- `tempMin` ≤ `tempMax` każdego dnia.
- Pola dzienne z Open-Meteo **daily** — nie zeruj.

### Godzinówka z Open-Meteo

Pola: `temperature_2m`, `precipitation_probability`, `wind_speed_10m`,
`weather_code`.

- Zaokrąglij do liczb całkowitych (°C, %, km/h).
- `wind_speed_10m` w API forecast jest w **km/h** — nie mnoż przez 3.6.
- `weather_code` → emoji WMO:

| Kod   | Emoji |
| ----- | ----- |
| 0     | ☀️    |
| 1     | 🌤️    |
| 2–3   | ⛅    |
| 45–48 | 🌫️    |
| 51–67 | 🌧️    |
| 71–77 | 🌨️    |
| 85–86 | ❄️    |
| 95–99 | ⛈️    |
| inne  | ☁️    |

Dozwolone emoji: ☀️ 🌤️ ⛅ ☁️ 🌧️ ⛈️ 🌨️ ❄️ 🌫️ 💨 🌪️

**Nie** dodawaj `summary` ani `emoji` na poziomie dnia.

## Checklist przed POST

Przejrzyj każdy punkt — typowe przyczyny 400:

- [ ] `locationId` = `id` z lokalizacji
- [ ] `generatedAt` = teraz, ISO 8601 UTC (np. `2026-07-06T09:00:00.000Z`)
- [ ] `sources` — niepusta tablica stringów
- [ ] `verdict.text` — 1–300 znaków
- [ ] `days.length` === 14
- [ ] Dni 0–2: po 24 wpisy w `hours`; dni 3–13: po 8 wpisów
- [ ] Każde `time` w formacie `YYYY-MM-DDTHH:00` (dwucyfrowa godzina)
- [ ] `tempMax` ≥ `tempMin` na każdym dniu
- [ ] Wszystkie liczby całkowite w zakresach: temp −60..60, % 0..100, wiatr
      0..300
- [ ] Body < 60 KiB

## Wysyłka

```bash
curl -s -w "\nHTTP:%{http_code}\n" -X POST $BASE_URL/api/forecast \
  -H "Content-Type: application/json" \
  -d @forecast.json
```

`BASE_URL` z promptu orkiestratora (domyślnie
`https://pogodai.keewinek.deno.net`).

| HTTP                | Działanie                                                |
| ------------------- | -------------------------------------------------------- |
| 200 + `{"ok":true}` | Sukces                                                   |
| 400                 | Przeczytaj `error`, popraw JSON, **jedna** ponowna próba |
| 404                 | Zły `locationId` — przerwij, zgłoś orkiestratorowi       |
| Inne / timeout      | Zgłoś błąd, nie wysyłaj pustej prognozy                  |

**Nie wysyłaj POST** gdy wszystkie źródła padły — zostaje stara prognoza.

**Minimum do wysłania:** przynajmniej **3** niezależne źródła z liczbami (w tym
≥ 1 model numeryczny). Poniżej — `posted=false`, nie wysyłaj.

## Schemat JSON

```json
{
  "locationId": "<id>",
  "generatedAt": "<ISO 8601 UTC>",
  "sources": ["open-meteo-icon", "open-meteo-gfs", "yr.no", "imgw", "tvn"],
  "verdict": {
    "text": "Po południu deszcz — weź parasol. ICON, GFS i ECMWF zbieżnie pokazują front; 14/22 źródeł potwierdza opady po 14:00.",
    "emoji": "🌧️",
    "temperature": 14,
    "feelsLike": 12,
    "precipitationChance": 70,
    "windKmh": 18
  },
  "days": []
}
```

## Endpointy

Zamień `{lat}`, `{lon}`:

```
https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&models=icon_seamless,gfs_seamless,ecmwf_ifs025&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&hourly=temperature_2m,precipitation_probability,wind_speed_10m,weather_code&current=temperature_2m,apparent_temperature,precipitation,wind_speed_10m&timezone=Europe%2FWarsaw&forecast_days=14
```

```
https://api.met.no/weatherapi/locationforecast/2.0/compact?lat={lat}&lon={lon}
```

Nagłówek: `User-Agent: PogodAI/1.0 (pogodai.keewinek.deno.net)`

WWW: `https://r.jina.ai/https://...`

## Odpowiedź dla orkiestratora

Na końcu zwróć **tylko** JSON (bez markdown):

```json
{
  "locationId": "<id>",
  "ok": true,
  "posted": true,
  "sources": 22,
  "generatedAt": "<z payloadu>",
  "verdictPreview": "<pierwsze ~80 znaków verdict.text>",
  "error": null
}
```

Gdy nie wysłałeś POST:
`"ok": false, "posted": false, "sources": 0,
"error": "brak źródeł"` (lub
konkretny powód).
