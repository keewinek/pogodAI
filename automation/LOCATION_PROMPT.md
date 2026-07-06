# PogodAI — subagent: prognoza dla jednej lokalizacji

Ten plik jest wywoływany przez orkiestratora (`automation/PROMPT.md`) jako
**osobny subagent na każdą lokalizację**. Subagent dostaje w promptcie obiekt
lokalizacji i wykonuje deep research tylko dla niej.

## Lokalizacja (wstrzykiwana przez orkiestratora)

```json
{
  "id": "<locationId>",
  "name": "<nazwa>",
  "lat": 0.0,
  "lon": 0.0
}
```

Użyj `{id}` jako `locationId` w JSON, `{name}` w wyszukiwaniach, `{lat}` i
`{lon}` w endpointach.

## Zadanie

Przeprowadź **deep research pogody** dla tej lokalizacji i wyślij **najbardziej
prawdopodobną** prognozę — syntezę wielu niezależnych źródeł, a nie przepisanie
jednego serwisu.

## Metoda (deep research)

1. **Zbierz twarde dane numeryczne** — modele matematyczne i API (Open-Meteo
   multi-model ICON+GFS+ECMWF, YR.no, IMGW, Open-Meteo ensemble jeśli dostępny).
2. **Zbierz dane redakcyjne i agregatory** — przez `https://r.jina.ai/<url>` lub
   bezpośrednie API tam, gdzie to tanie: TVN Meteo, Interia, Onet, WP, meteo.pl,
   AccuWeather, Weather.com, Meteoblue, Foreca, MSN Pogoda, Google
   (`pogoda {nazwa}`), WetterOnline, IMGW.
3. **Poszukaj dodatkowych źródeł** — w wynikach wyszukiwania i lokalnych
   portalach; każde sensowne źródło z konkretnymi liczbami dla właściwej
   miejscowości liczy się do syntezy. Nie używaj forów, social mediów, paywalli.
4. **Cel:** minimum **15**, docelowo **~30** faktycznie użytych źródeł. W
   `sources` wpisuj tylko te, z których realnie wziąłeś dane (modele jako
   `open-meteo-icon`, `open-meteo-gfs`, `yr.no`, domeny serwisów itd.).

## Analiza (najwyższe prawdopodobieństwo)

- Traktuj **modele numeryczne** jako szkielet prognozy godzinowej i dziennej
  (szczególnie Open-Meteo hourly — nie wymyślaj godzin ręcznie).
- **Waż konsensus:** mediana / większość głosów przy temperaturze, opadach,
  wietrze.
- Gdy źródła się **rozbieżają**, oceń które są bardziej wiarygodne w danym
  scenariuszu (np. lokalny front → wyższa waga IMGW + modele ECMWF; stabilna
  antycyklonowa → spójność wielu modeli). Nie faworyzuj ślepo jednego typu —
  uzasadnij wybór.
- Szacuj **prawdopodobieństwo** zdarzeń (opady, burze, mgła) i wpisuj je w
  `precipitationChance` oraz werdykt, gdy dane na to pozwalają.
- **Nie zmyślaj:** przy małej liczbie źródeł obniż pewność i napisz to w
  werdykcie.

## Werdykt (`verdict.text`)

Max **3 zdania**, po polsku, łącznie do 300 znaków:

1. **Zdanie 1 — werdykt praktyczny:** co będzie i co zrobić (np. „Po południu
   rozpada się — weź parasol.”).
2. **Zdanie 2–3 — uzasadnienie naukowe:** krótko, konkretnie — np. zgodność
   modeli („ICON, GFS i ECMWF zbieżnie pokazują front chłodny po 14:00”), liczba
   zgodnych źródeł („12/18 źródeł wskazuje opady”), ewentualna niepewność
   („modele rozjechane co do intensywności — możliwy tylko przelotny deszcz”).

## Kroki wykonania

1. Zbuduj JSON zgodny ze schematem (poniżej).
2. Wyślij **tylko dla tej lokalizacji**:

```bash
curl -s -X POST https://pogodai.keewinek.deno.net/api/forecast \
  -H "Content-Type: application/json" \
  -d '<json>'
```

3. Sprawdź `{"ok":true}`. Przy **400** — przeczytaj `error`, popraw JSON, ponów
   raz. Gdy **wszystkie** źródła padły — **nie** wysyłaj POST (zostaje stara
   prognoza).
4. Zwróć orkiestratorowi krótkie podsumowanie:
   - `locationId`, `ok` (true/false), `sources` (liczba), ewentualny `error`.

## Schemat JSON

```json
{
  "locationId": "<id z lokalizacji>",
  "generatedAt": "<teraz, ISO 8601 UTC>",
  "sources": ["open-meteo", "yr.no", "imgw", "tvn", "interia"],
  "verdict": {
    "text": "Po południu deszcz — weź parasol. ICON, GFS i ECMWF zbieżnie pokazują front; 14/22 źródeł potwierdza opady po 14:00.",
    "emoji": "🌧️",
    "temperature": 14,
    "feelsLike": 12,
    "precipitationChance": 70,
    "windKmh": 18
  },
  "days": [
    {
      "date": "YYYY-MM-DD",
      "tempMin": 9,
      "tempMax": 15,
      "precipitationChance": 70,
      "windKmh": 18,
      "hours": [
        {
          "time": "YYYY-MM-DDTHH:00",
          "emoji": "🌧️",
          "temperature": 14,
          "precipitationChance": 70,
          "windKmh": 18
        }
      ]
    }
  ]
}
```

## Wymagania techniczne

- `days`: **14 dni**, `[0]` = dziś — **tylko liczby i godzinówka**, bez tekstów
  werdyktowych.
- `hours`: **dni 1–3** (dziś, jutro, pojutrze — indeksy `[0]`–`[2]`) co 1 h
  (**24 wpisy** na dzień); **dni 4–14** (indeksy `[3]`–`[13]`) co 3 h (**8
  wpisów** na dzień).
- Pola dzienne `tempMin`, `tempMax`, `precipitationChance`, `windKmh` bierz z
  Open-Meteo **daily** (nie zeruj — muszą być spójne z godzinówką).
- **Nie** dodawaj `summary` ani `emoji` na poziomie dnia — ikona dnia liczy się
  w aplikacji z godzinówki.
- Godzinówkę zbuduj z Open-Meteo hourly: weź `temperature_2m`,
  `precipitation_probability`, `wind_speed_10m`, `weather_code`; zaokrąglij do
  liczb całkowitych; `weather_code` → emoji wg WMO: 0→☀️, 1→🌤️, 2–3→⛅,
  45–48→🌫️, 51–67→🌧️, 71–77→🌨️, 85–86→❄️, 95–99→⛈️, inaczej ☁️.
- `time` w strefie Europe/Warsaw.
- Emoji w `hours[]` z `weather_code` (WMO). Aplikacja wybiera ikonę wg
  hierarchii: **burza → deszcz → wiatr (≥ 60 km/h) → pochmurno → słońce** (w
  nocy bez opadów: pochmurno i słońce → księżyc).
- Emoji tylko: ☀️ 🌤️ ⛅ ☁️ 🌧️ ⛈️ 🌨️ ❄️ 🌫️ 💨 🌪️
- Liczby całkowite: °C, km/h, %.
- Nie cytuj całych stron — wyciągaj liczby i wnioski.

## Endpointy (użyj `{lat}`, `{lon}`, `{name}` z lokalizacji)

- Open-Meteo multi-model:
  `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&models=icon_seamless,gfs_seamless,ecmwf_ifs025&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&hourly=temperature_2m,precipitation_probability,wind_speed_10m,weather_code&current=temperature_2m,apparent_temperature,precipitation,wind_speed_10m&timezone=Europe%2FWarsaw&forecast_days=14`
- YR.no:
  `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat={lat}&lon={lon}`
  (nagłówek `User-Agent: PogodAI/1.0`)
- Serwisy WWW: `https://r.jina.ai/https://...`
