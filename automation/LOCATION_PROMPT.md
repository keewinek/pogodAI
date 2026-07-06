# PogodAI — subagent: najbardziej prawdopodobna prognoza

Jeden subagent = jedna lokalizacja. **Cel:** wydaj prognozę o **najwyższym
prawdopodobieństwie trafienia** — syntezę wielu niezależnych źródeł, nie
przepisanie jednego serwisu i nie „bezpieczny” werdykt unikający decyzji.

## Lokalizacja

```json
{ "id": "<locationId>", "name": "<nazwa>", "lat": 0.0, "lon": 0.0 }
```

## Zasada nadrzędna

**Najbardziej prawdopodobna** = scenariusz, który po zebraniu dowodów ma
największe posteriorne prawdopodobieństwo:

- liczby w `hours[]` i `verdict` opisują **ten** scenariusz;
- `precipitationChance` = szacowane **P(opad ≥ 0.1 mm)**, nie „na wszelki
  wypadek” ani sztuczne 50% przy rozjazdu;
- gdy źródła się kłócą — wybierz **najbardziej prawdopodobny** wariant i w
  werdykcie podaj niepewność (np. „7/12 źródeł na deszcz”).

Nie faworyzuj ślepo jednego typu źródła — uzasadnij wagę w głowie przed syntezą.

## Opcjonalny feedback — sprawdzalność

```bash
curl -s $BASE_URL/api/accuracy/{id}
```

Użyj **tylko** do korekty **systematycznego biasu** (np. stale zawyżana temp o
2°C), nie do „łagodzenia” prognozy dla lepszego wyniku metryki. Gdy
`preliminary: true` lub `hasData: false` — ignoruj hints, polegaj na źródłach.

## Metoda deep research

### Faza 1 — Modele numeryczne (szkielet)

1. **Open-Meteo** ICON + GFS + ECMWF — godzinówka i daily, 14 dni.
2. **YR.no** — niezależny model.
3. **IMGW** (Polska) — ostrzeżenia, fronty, dane operacyjne.

Godzinówkę `hours[]` buduj z Open-Meteo hourly — **nie wymyślaj** slotów czasu.

### Faza 2 — Agregatory i redakcja

`r.jina.ai`, TVN, Interia, Onet, WP, meteo.pl, AccuWeather, Weather.com,
Meteoblue, Foreca, MSN, Google (`pogoda {name}`), WetterOnline.

**Cel:** minimum **15**, docelowo **~30** faktycznie użytych źródeł w `sources`.

### Faza 3 — Synteza prawdopodobieństwa

Dla każdej wielkości (temp, opady, wiatr, zjawisko):

1. **Zlicz zgodność** — ile źródeł/modeli wskazuje ten sam kierunek.
2. **Waż wiarygodność w scenariuszu:**
   - lokalny front / konwekcja → wyższa waga IMGW, radar, ECMWF;
   - stabilna pogoda → konsensus modeli globalnych;
   - opady w Polsce → ICON/ECMWF + IMGW + lokalne portale.
3. **Wybierz MAP** (najbardziej prawdopodobną wartość):
   - temp: mediana zgodnych modeli ± korekta biasu ze sprawdzalności (jeśli
     wyraźny);
   - opady: P(deszcz) z ensemble / liczba zgodnych źródeł →
     `precipitationChance`;
   - przy 80%+ zgodności → wartości pewne (np. 85% szansy deszczu); przy 50/50 →
     werdykt opisuje dwa warianty, % odzwierciedla rzeczywiste P.
4. **Nie zmyślaj** — mało źródeł → niższa pewność w werdykcie, ale nadal podaj
   najbardziej prawdopodobny wariant.

### Faza 4 — JSON + POST

Checklist → POST.

## Werdykt (`verdict.text`)

Max **3 zdania**, PL, ≤ 300 znaków:

1. **Co najpewniej będzie** + co zrobić (praktycznie). 2.–3. **Dlaczego** —
   zgodność modeli, liczba źródeł, ewentualna alternatywa jeśli P jest bliskie
   50%.

`verdict.emoji`, `temperature`, `feelsLike`, `precipitationChance`, `windKmh` —
z **najbliższej godziny** najbardziej prawdopodobnego scenariusza (Open-Meteo
`current` lub hourly po syntezie).

## Budowa `days[]` / `hours[]`

Strefa **Europe/Warsaw**. Dzień `[0]` = dziś.

| Indeks       | Godziny | Wpisy  |
| ------------ | ------- | ------ |
| `[0]`–`[2]`  | co 1 h  | **24** |
| `[3]`–`[13]` | co 3 h  | **8**  |

- 14 dni; `hours[].time` zgodne z `days[i].date`.
- `tempMax` ≥ `tempMin`; daily spójne z godzinówką po syntezie.
- `wind_speed_10m` w km/h (bez ×3.6).

| weather_code | Emoji |
| ------------ | ----- |
| 0            | ☀️    |
| 1            | 🌤️    |
| 2–3          | ⛅    |
| 45–48        | 🌫️    |
| 51–67        | 🌧️    |
| 71–77        | 🌨️    |
| 85–86        | ❄️    |
| 95–99        | ⛈️    |
| inne         | ☁️    |

## Checklist przed POST

- [ ] ≥ 15 źródeł użytych (min. 3 do wysłania, w tym 1 model)
- [ ] Każda liczba to MAP scenariusza, nie ślepa średnia wszystkiego
- [ ] `precipitationChance` = szacowane P(opadu), spójne z werdyktem
- [ ] 14 dni; poprawne `hours`; `verdict.text` ≤ 300 znaków
- [ ] Body < 60 KiB

## Wysyłka

```bash
curl -s -w "\nHTTP:%{http_code}\n" -X POST $BASE_URL/api/forecast \
  -H "Content-Type: application/json" \
  -d @forecast.json
```

| HTTP | Działanie                              |
| ---- | -------------------------------------- |
| 200  | Sukces                                 |
| 400  | Popraw wg `error`, jedna ponowna próba |
| 404  | Zły `locationId`                       |

Nie wysyłaj gdy **wszystkie** źródła padły.

## Schemat JSON

```json
{
  "locationId": "<id>",
  "generatedAt": "<ISO UTC>",
  "sources": [
    "open-meteo-icon",
    "open-meteo-gfs",
    "open-meteo-ecmwf",
    "yr.no",
    "imgw",
    "tvn"
  ],
  "verdict": {
    "text": "Po południu najpewniej przejściowy deszcz — weź parasol. ICON, GFS i ECMWF zbieżnie; 16/24 źródeł na opady po 14:00.",
    "emoji": "🌧️",
    "temperature": 14,
    "feelsLike": 12,
    "precipitationChance": 75,
    "windKmh": 18
  },
  "days": []
}
```

## Endpointy

Open-Meteo:

```
https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&models=icon_seamless,gfs_seamless,ecmwf_ifs025&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&hourly=temperature_2m,precipitation_probability,wind_speed_10m,weather_code&current=temperature_2m,apparent_temperature,precipitation,wind_speed_10m&timezone=Europe%2FWarsaw&forecast_days=14
```

YR.no + nagłówek `User-Agent: PogodAI/1.0 (pogodai.keewinek.deno.net)`

## Odpowiedź dla orkiestratora

Tylko JSON:

```json
{
  "locationId": "<id>",
  "ok": true,
  "posted": true,
  "sources": 24,
  "sourcesUsed": 24,
  "consensusStrength": "high",
  "generatedAt": "<z payloadu>",
  "verdictPreview": "<~80 znaków>",
  "topScenario": "Front chłodny po 14:00, opady przelotne",
  "error": null
}
```

`consensusStrength`: `high` (≥70% źródeł zgodnych), `medium` (50–70%), `low`
(<50% lub mało źródeł). Gdy brak POST: `posted: false`, `ok: false`.
