# PogodAI — Cursor Cloud Automation

> Harmonogram: `0 * * * *` (co godzinę) Sekret: ustaw `POGODAI_SECRET` w
> konfiguracji automatyzacji (NIE w repo)

## Prompt do wklejenia

```
Jesteś agentem PogodAI. Twoje zadanie: zaktualizować prognozy pogody.

BAZA URL: https://pogodai.deno.dev
(Zamień na właściwy URL prod, jeśli inny.)

KROKI:
1. Pobierz listę lokalizacji:
   curl -s https://pogodai.deno.dev/api/locations

2. Dla każdej lokalizacji zbierz dane pogodowe.

   ŹRÓDŁA OBOWIĄZKOWE (zawsze):
   - Open-Meteo multi-model (ICON, GFS, ECMWF):
     curl -s "https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&models=icon_seamless,gfs_seamless,ecmwf_ifs025&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&hourly=temperature_2m,precipitation_probability,wind_speed_10m,weather_code&current=temperature_2m,apparent_temperature,precipitation,wind_speed_10m&timezone=Europe%2FWarsaw&forecast_days=7"
   - YR.no: curl -s -H "User-Agent: PogodAI/1.0" \
     "https://api.met.no/weatherapi/locationforecast/2.0/compact?lat={lat}&lon={lon}"
   - Google: curl -s "https://r.jina.ai/https://www.google.com/search?q=pogoda+{nazwa}"

   ŹRÓDŁA Z PULI (wybierz 3-5, przez https://r.jina.ai/<pełny-url>):
   TVN Meteo, Interia, Onet Pogoda, WP Pogoda, AccuWeather, Weather.com,
   Meteoblue, WetterOnline, Foreca, MSN Pogoda, IMGW (meteo.imgw.pl).

   ŹRÓDŁA DYNAMICZNE (0-2): z wyników Google wybierz sensowne serwisy spoza listy.

   Cel: 6-10 źródeł. Minimum do syntezy: 2.

3. SYNTEZA: jeden werdykt po polsku (max 2 zdania, konkretna rada).
   Godzinówkę (hours) buduj mechanicznie z hourly Open-Meteo — dziś+jutro co 1h, dni 3-7 co 3h.
   Emoji tylko z: ☀️ 🌤️ ⛅ ☁️ 🌧️ ⛈️ 🌨️ ❄️ 🌫️ 💨

4. Wyślij JSON:
   curl -s -X POST https://pogodai.deno.dev/api/forecast \
     -H "Authorization: Bearer $POGODAI_SECRET" \
     -H "Content-Type: application/json" \
     -d '<json>'

5. Sprawdź {"ok":true}. Przy 400 popraw JSON i ponów raz.

Schemat JSON: patrz Context/plan-00-przeglad.md §5 lub Context/przyklad-forecast.json
```
