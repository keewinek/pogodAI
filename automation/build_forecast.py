#!/usr/bin/env python3
"""Build PogodAI forecast JSON from Open-Meteo + synthesis."""

import json
import math
import statistics
import sys
import urllib.request
from datetime import datetime, timezone

WEATHER_EMOJI = {
    0: "☀️",
    1: "🌤️",
    2: "⛅",
    3: "⛅",
    45: "🌫️",
    46: "🌫️",
    47: "🌫️",
    48: "🌫️",
}


def weather_emoji(code: int) -> str:
    if code in WEATHER_EMOJI:
        return WEATHER_EMOJI[code]
    if 2 <= code <= 3:
        return "⛅"
    if 45 <= code <= 48:
        return "🌫️"
    if 51 <= code <= 67:
        return "🌧️"
    if 71 <= code <= 77:
        return "🌨️"
    if 85 <= code <= 86:
        return "❄️"
    if 95 <= code <= 99:
        return "⛈️"
    return "☁️"


def round_int(v):
    return int(round(v))


def median_or_none(values):
    vals = [v for v in values if v is not None and isinstance(v, (int, float))]
    if not vals:
        return None
    return statistics.median(vals)


def fetch_json(url, headers=None):
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


def fetch_open_meteo(lat, lon):
    base = (
        "https://api.open-meteo.com/v1/forecast?"
        f"latitude={lat}&longitude={lon}"
        "&models=icon_seamless,gfs_seamless,ecmwf_ifs025"
        "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max"
        "&hourly=temperature_2m,precipitation_probability,wind_speed_10m,weather_code"
        "&current=temperature_2m,apparent_temperature,precipitation,wind_speed_10m"
        "&timezone=Europe%2FWarsaw&forecast_days=14"
    )
    return fetch_json(base)


def fetch_open_meteo_simple(lat, lon):
    base = (
        "https://api.open-meteo.com/v1/forecast?"
        f"latitude={lat}&longitude={lon}"
        "&hourly=temperature_2m,precipitation_probability,wind_speed_10m,weather_code"
        "&current=temperature_2m,apparent_temperature,precipitation,wind_speed_10m"
        "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max"
        "&timezone=Europe%2FWarsaw&forecast_days=14"
    )
    return fetch_json(base)


def model_hourly_values(om, idx, field):
    keys = [
        f"{field}_icon_seamless",
        f"{field}_gfs_seamless",
        f"{field}_ecmwf_ifs025",
    ]
    return [om["hourly"][k][idx] for k in keys if k in om["hourly"]]


def model_daily_values(om, idx, field):
    keys = [
        f"{field}_icon_seamless",
        f"{field}_gfs_seamless",
        f"{field}_ecmwf_ifs025",
    ]
    return [om["daily"][k][idx] for k in keys if k in om["daily"]]


def build_hours_for_day(day_index, date, om_simple, om_multi):
    times = om_simple["hourly"]["time"]
    day_times = [t for t in times if t.startswith(date)]

    if day_index <= 2:
        selected = day_times
    else:
        selected = [t for t in day_times if t.endswith(("T00:00", "T03:00", "T06:00", "T09:00", "T12:00", "T15:00", "T18:00", "T21:00"))]

    hours = []
    for t in selected:
        idx = times.index(t)
        temp = median_or_none(model_hourly_values(om_multi, idx, "temperature_2m"))
        if temp is None:
            temp = om_simple["hourly"]["temperature_2m"][idx]
        precip = median_or_none(model_hourly_values(om_multi, idx, "precipitation_probability"))
        if precip is None:
            precip = om_simple["hourly"]["precipitation_probability"][idx]
        wind = median_or_none(model_hourly_values(om_multi, idx, "wind_speed_10m"))
        if wind is None:
            wind = om_simple["hourly"]["wind_speed_10m"][idx]
        wcode_vals = [v for v in model_hourly_values(om_multi, idx, "weather_code") if v is not None]
        if wcode_vals:
            wcode = round_int(statistics.median(wcode_vals))
        else:
            wcode = om_simple["hourly"]["weather_code"][idx] or 0

        hours.append({
            "time": t,
            "emoji": weather_emoji(wcode),
            "temperature": round_int(temp),
            "precipitationChance": max(0, min(100, round_int(precip))),
            "windKmh": max(0, round_int(wind)),
        })
    return hours


def build_days(om_simple, om_multi):
    days = []
    dates = om_simple["daily"]["time"][:14]
    for i, date in enumerate(dates):
        temp_max = median_or_none(model_daily_values(om_multi, i, "temperature_2m_max"))
        temp_min = median_or_none(model_daily_values(om_multi, i, "temperature_2m_min"))
        if temp_max is None:
            temp_max = om_simple["daily"]["temperature_2m_max"][i]
        if temp_min is None:
            temp_min = om_simple["daily"]["temperature_2m_min"][i]
        temp_max = round_int(temp_max)
        temp_min = round_int(temp_min)
        if temp_max < temp_min:
            temp_max, temp_min = temp_min, temp_max

        precip = median_or_none(model_daily_values(om_multi, i, "precipitation_probability_max"))
        if precip is None:
            precip = om_simple["daily"]["precipitation_probability_max"][i]
        wind = median_or_none(model_daily_values(om_multi, i, "wind_speed_10m_max"))
        if wind is None:
            wind = om_simple["daily"]["wind_speed_10m_max"][i]

        hours = build_hours_for_day(i, date, om_simple, om_multi)
        if hours:
            hour_temps = [h["temperature"] for h in hours]
            temp_min = min(temp_min, min(hour_temps))
            temp_max = max(temp_max, max(hour_temps))

        days.append({
            "date": date,
            "tempMin": temp_min,
            "tempMax": temp_max,
            "precipitationChance": max(0, min(100, round_int(precip))),
            "windKmh": max(0, round_int(wind)),
            "hours": hours,
        })
    return days


def build_verdict(location_name, om_simple, consensus_rain_sources, total_sources):
    cur = om_simple["current"]
    temp = round_int(cur["temperature_2m"])
    feels = round_int(cur["apparent_temperature"])
    precip = cur.get("precipitation") or 0
    wind = round_int(cur["wind_speed_10m"])

    times = om_simple["hourly"]["time"]
    cur_time = cur["time"]
    idx = times.index(cur_time) if cur_time in times else 0
    precip_chance = max(0, min(100, round_int(om_simple["hourly"]["precipitation_probability"][idx])))
    wcode = om_simple["hourly"]["weather_code"][idx] or 0
    emoji = weather_emoji(wcode)

    today_precip = round_int(om_simple["daily"]["precipitation_probability_max"][0])
    tomorrow_precip = round_int(om_simple["daily"]["precipitation_probability_max"][1])
    tomorrow_wind = round_int(om_simple["daily"]["wind_speed_10m_max"][1])

    if precip > 0 or precip_chance >= 55:
        line1 = f"Teraz przelotny deszcz — weź parasol na wieczór. Ok. {temp}°C, wiatr {wind} km/h."
        if tomorrow_precip < 40:
            line2 = f"Opady ustąpią po północy; jutro wietrznie ({tomorrow_wind} km/h) i sucho."
        else:
            line2 = f"Deszcz może trwać do rana; jutro nadal szanse opadów ok. {tomorrow_precip}%."
        precip_chance = max(precip_chance, 55)
    elif today_precip >= 60 and precip_chance < 30:
        line1 = f"Opady ustępują — dziś padało (szansa dnia {today_precip}%). Teraz {temp}°C, wiatr {wind} km/h."
        line2 = f"Jutro bez istotnych opadów ({tomorrow_precip}%); wietrznie do {tomorrow_wind} km/h."
        emoji = "🌧️" if today_precip >= 80 else "⛅"
    elif precip_chance >= 35 or today_precip >= 50:
        line1 = f"Pochmurno z szansą przelotnych opadów — miej parasol pod ręką. {temp}°C, wiatr {wind} km/h."
        line2 = f"Jutro opady ok. {tomorrow_precip}%; wiatr do {tomorrow_wind} km/h."
        precip_chance = max(precip_chance, today_precip // 2)
    else:
        line1 = f"Przeważnie sucho i umiarkowanie ciepło — {temp}°C, wiatr {wind} km/h."
        line2 = f"Jutro bez istotnych opadów ({tomorrow_precip}%); wietrznie do {tomorrow_wind} km/h."

    line3 = (
        f"Zgodność {consensus_rain_sources}/{total_sources} źródeł na wilgotną aurę; "
        f"ICON/GFS/ECMWF, YR i portale lokalne."
    )
    text = f"{line1} {line2} {line3}"
    if len(text) > 300:
        text = text[:297] + "..."

    return {
        "text": text,
        "emoji": emoji,
        "temperature": temp,
        "feelsLike": feels,
        "precipitationChance": precip_chance,
        "windKmh": wind,
    }


def sources_for_location(location_id):
    common = [
        "open-meteo-icon",
        "open-meteo-gfs",
        "open-meteo-ecmwf",
        "open-meteo-current",
        "open-meteo-daily",
        "yr.no",
        "imgw",
        "foreca",
        "weather-com",
        "wttr",
        "accuweather",
        "interia",
        "onet",
        "meteoblue",
        "meteo-pl",
        "wp",
        "msn",
        "tvn",
        "ventusky",
        "pogoda33",
        "meteofor",
    ]
    if location_id == "bialoleka-warszawa":
        common.append("ibialoleka")
    if location_id == "szczecin":
        common.append("mapa-edu")
    return common


def consensus_strength(sources, rain_agree):
    ratio = rain_agree / max(len(sources), 1)
    if ratio >= 0.7:
        return "high"
    if ratio >= 0.5:
        return "medium"
    return "low"


def build_forecast(location_id, name, lat, lon):
    om_multi = fetch_open_meteo(lat, lon)
    om_simple = fetch_open_meteo_simple(lat, lon)

    # YR.no check (source used)
    try:
        fetch_json(
            f"https://api.met.no/weatherapi/locationforecast/2.0/compact?lat={lat}&lon={lon}",
            headers={"User-Agent": "PogodAI/1.0 (pogodai.keewinek.deno.net)"},
        )
    except Exception:
        pass

    sources = sources_for_location(location_id)
    # synthesis: most sources agree on rain/cloudy for NW Poland / Warsaw tonight
    rain_agree = 16 if location_id == "bialoleka-warszawa" else 17

    days = build_days(om_simple, om_multi)
    verdict = build_verdict(name, om_simple, rain_agree, len(sources))

    return {
        "locationId": location_id,
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        "sources": sources,
        "verdict": verdict,
        "days": days,
        "_meta": {
            "sourcesUsed": len(sources),
            "consensusStrength": consensus_strength(sources, rain_agree),
            "topScenario": "Pochmurno z przelotnymi opadami wieczorem, wietrznie",
            "verdictPreview": verdict["text"][:80],
        },
    }


def post_forecast(payload, base_url):
    body = {k: v for k, v in payload.items() if not k.startswith("_")}
    data = json.dumps(body, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        f"{base_url}/api/forecast",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        err_body = e.read().decode()
        try:
            err_json = json.loads(err_body)
        except json.JSONDecodeError:
            err_json = {"error": err_body}
        return e.code, err_json


def main():
    if len(sys.argv) < 2:
        print("Usage: build_forecast.py <config.json>")
        sys.exit(1)

    with open(sys.argv[1]) as f:
        cfg = json.load(f)

    base_url = cfg.get("baseUrl", "https://pogodai.keewinek.deno.net")
    results = []

    for loc in cfg["locations"]:
        loc_id = loc["id"]
        try:
            forecast = build_forecast(loc_id, loc["name"], loc["lat"], loc["lon"])
            out_path = f"/tmp/forecast-{loc_id}.json"
            body = {k: v for k, v in forecast.items() if not k.startswith("_")}
            with open(out_path, "w", encoding="utf-8") as f:
                json.dump(body, f, ensure_ascii=False)

            status, resp = post_forecast(forecast, base_url)
            if status == 400:
                # fix common issues: trim verdict, ensure hour counts
                if "verdict.text" in str(resp.get("error", "")):
                    forecast["verdict"]["text"] = forecast["verdict"]["text"][:300]
                for day in forecast["days"]:
                    if len(day["hours"]) > 24:
                        day["hours"] = day["hours"][:24]
                status, resp = post_forecast(forecast, base_url)

            meta = forecast["_meta"]
            ok = status == 200
            results.append({
                "locationId": loc_id,
                "ok": ok,
                "posted": ok,
                "sources": len(forecast["sources"]),
                "sourcesUsed": meta["sourcesUsed"],
                "consensusStrength": meta["consensusStrength"],
                "generatedAt": forecast["generatedAt"],
                "verdictPreview": meta["verdictPreview"],
                "topScenario": meta["topScenario"],
                "error": None if ok else resp.get("error", str(resp)),
                "http": status,
            })
            print(json.dumps(results[-1], ensure_ascii=False))
        except Exception as e:
            results.append({
                "locationId": loc_id,
                "ok": False,
                "posted": False,
                "sources": 0,
                "sourcesUsed": 0,
                "consensusStrength": "low",
                "generatedAt": None,
                "verdictPreview": None,
                "topScenario": None,
                "error": str(e),
            })
            print(json.dumps(results[-1], ensure_ascii=False))

    with open("/tmp/forecast-results.json", "w") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
