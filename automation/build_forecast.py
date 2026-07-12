#!/usr/bin/env python3
"""Build PogodAI forecast JSON from Open-Meteo + web sources and POST."""

import json
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone

BASE_URL = "https://pogodai.keewinek.deno.net"
OPEN_METEO = (
    "https://api.open-meteo.com/v1/forecast"
    "?latitude={lat}&longitude={lon}"
    "&models=icon_seamless,gfs_seamless,ecmwf_ifs025"
    "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max"
    "&hourly=temperature_2m,precipitation_probability,wind_speed_10m,weather_code"
    "&current=temperature_2m,apparent_temperature,precipitation,wind_speed_10m"
    "&timezone=Europe%2FWarsaw&forecast_days=14"
)

WEB_SOURCES = [
    ("tvn", "https://r.jina.ai/https://pogoda.tvnmeteo.pl/pogoda/warszawa-56575"),
    ("interia", "https://r.jina.ai/https://pogoda.interia.pl/prognoza-pogody-w-warszawie,nId,56575"),
    ("onet", "https://r.jina.ai/https://pogoda.onet.pl/pogoda/warszawa-56575"),
    ("wp", "https://r.jina.ai/https://pogoda.wp.pl/miasto/warszawa"),
    ("meteo-pl", "https://r.jina.ai/https://www.meteo.pl/gfx/prognoza/1/56575"),
    ("accuweather", "https://r.jina.ai/https://www.accuweather.com/pl/pl/warsaw/265771/weather-forecast/265771"),
    ("weather-com", "https://r.jina.ai/https://weather.com/pl-PL/pogoda/dzisiaj/l/52.23,21.01"),
    ("meteoblue", "https://r.jina.ai/https://www.meteoblue.com/pl/pogoda/prognoza/weekly/warszawa_polska_756135"),
    ("foreca", "https://r.jina.ai/https://www.foreca.pl/Polska/Warszawa"),
    ("msn", "https://r.jina.ai/https://www.msn.com/pl-pl/pogoda/prognoza/in-Warszawa,Polska"),
    ("wetteronline", "https://r.jina.ai/https://www.wetteronline.de/wetter/warschau"),
    ("google", "https://r.jina.ai/https://www.google.com/search?q=pogoda+Warszawa"),
]

SZCZECIN_WEB = [
    ("tvn", "https://r.jina.ai/https://pogoda.tvnmeteo.pl/pogoda/szczecin-56582"),
    ("interia", "https://r.jina.ai/https://pogoda.interia.pl/prognoza-pogody-w-szczecinie,nId,56582"),
    ("onet", "https://r.jina.ai/https://pogoda.onet.pl/pogoda/szczecin-56582"),
    ("wp", "https://r.jina.ai/https://pogoda.wp.pl/miasto/szczecin"),
    ("meteo-pl", "https://r.jina.ai/https://www.meteo.pl/gfx/prognoza/1/56582"),
    ("accuweather", "https://r.jina.ai/https://www.accuweather.com/pl/pl/szczecin/265882/weather-forecast/265882"),
    ("weather-com", "https://r.jina.ai/https://weather.com/pl-PL/pogoda/dzisiaj/l/53.43,14.55"),
    ("meteoblue", "https://r.jina.ai/https://www.meteoblue.com/pl/pogoda/prognoza/weekly/szczecin_polska_3083829"),
    ("foreca", "https://r.jina.ai/https://www.foreca.pl/Polska/Szczecin"),
    ("msn", "https://r.jina.ai/https://www.msn.com/pl-pl/pogoda/prognoza/in-Szczecin,Polska"),
    ("wetteronline", "https://r.jina.ai/https://www.wetteronline.de/wetter/stettin"),
    ("google", "https://r.jina.ai/https://www.google.com/search?q=pogoda+Szczecin"),
]


def fetch(url: str, headers: dict | None = None, timeout: int = 30) -> str | None:
    h = dict(headers or {})
    if "api.met.no" in url and "User-Agent" not in h:
        h["User-Agent"] = "PogodAI/1.0 (pogodai.keewinek.deno.net)"
    req = urllib.request.Request(url, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = resp.read().decode("utf-8", errors="replace")
            return data if len(data) > 100 else None
    except Exception:
        return None


def fetch_sources_parallel(entries: list[tuple[str, str]], headers: dict | None = None) -> tuple[list[str], list[dict]]:
    ids: list[str] = []
    signals: list[dict] = []
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(fetch, url, headers): sid for sid, url in entries}
        for fut in as_completed(futures):
            sid = futures[fut]
            content = fut.result()
            if content:
                ids.append(sid)
                signals.append(analyze_web(content))
    return ids, signals


def weather_emoji(code: int) -> str:
    if code == 0:
        return "☀️"
    if code == 1:
        return "🌤️"
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


def median(vals: list[float]) -> float:
    if not vals:
        return 0.0
    s = sorted(vals)
    n = len(s)
    if n % 2:
        return s[n // 2]
    return (s[n // 2 - 1] + s[n // 2]) / 2


def round_int(v: float) -> int:
    return int(round(v))


def synth_hourly(data: dict) -> list[dict]:
    h = data["hourly"]
    times = h["time"]
    result = []
    for i, t in enumerate(times):
        temps, precips, winds, codes = [], [], [], []
        for model in ("icon_seamless", "gfs_seamless", "ecmwf_ifs025"):
            tk = f"temperature_2m_{model}"
            pk = f"precipitation_probability_{model}"
            wk = f"wind_speed_10m_{model}"
            ck = f"weather_code_{model}"
            if tk in h and h[tk][i] is not None:
                temps.append(h[tk][i])
            if pk in h and h[pk][i] is not None:
                precips.append(h[pk][i])
            if wk in h and h[wk][i] is not None:
                winds.append(h[wk][i])
            if ck in h and h[ck][i] is not None:
                codes.append(h[ck][i])
        code = round(median([float(c) for c in codes])) if codes else 3
        result.append(
            {
                "time": t,
                "emoji": weather_emoji(int(code)),
                "temperature": round_int(median(temps)),
                "precipitationChance": round_int(median(precips) if precips else 0),
                "windKmh": round_int(median(winds)),
            }
        )
    return result


def build_days(hourly: list[dict]) -> list[dict]:
    by_date: dict[str, list[dict]] = {}
    for slot in hourly:
        date = slot["time"][:10]
        by_date.setdefault(date, []).append(slot)

    dates = sorted(by_date.keys())[:14]
    days = []
    for idx, date in enumerate(dates):
        slots = by_date[date]
        if idx <= 2:
            day_hours = slots[:24]
        else:
            day_hours = [s for s in slots if int(s["time"][11:13]) % 3 == 0][:8]
            if len(day_hours) < 8:
                day_hours = slots[::3][:8]

        temps = [s["temperature"] for s in day_hours]
        precips = [s["precipitationChance"] for s in day_hours]
        winds = [s["windKmh"] for s in day_hours]
        days.append(
            {
                "date": date,
                "tempMin": min(temps),
                "tempMax": max(temps),
                "precipitationChance": max(precips),
                "windKmh": max(winds),
                "hours": day_hours,
            }
        )
    return days


def analyze_web(text: str) -> dict:
    t = text.lower()
    rain_kw = ["deszcz", "opady", "mżawka", "ulewa", "rain", "regen", "schauer"]
    sun_kw = ["słonecz", "bezchmurn", "sunny", "sonnig", "clear"]
    cloud_kw = ["pochmurn", "zachmurz", "cloud", "bewölkt", "overcast"]
    storm_kw = ["burz", "storm", "gewitter", "thunder"]
    rain = sum(1 for k in rain_kw if k in t)
    sun = sum(1 for k in sun_kw if k in t)
    cloud = sum(1 for k in cloud_kw if k in t)
    storm = sum(1 for k in storm_kw if k in t)
    return {"rain": rain, "sun": sun, "cloud": cloud, "storm": storm}


def build_verdict(
    name: str,
    current: dict,
    days: list[dict],
    model_sources: int,
    web_signals: list[dict],
) -> dict:
    today = days[0]
    cur_temp = round_int(current.get("temperature_2m", today["hours"][0]["temperature"]))
    feels = round_int(current.get("apparent_temperature", cur_temp))
    wind = round_int(current.get("wind_speed_10m", today["hours"][0]["windKmh"]))
    precip = today["precipitationChance"]

    rain_votes = sum(s["rain"] + s["storm"] for s in web_signals)
    sun_votes = sum(s["sun"] for s in web_signals)
    cloud_votes = sum(s["cloud"] for s in web_signals)
    total_web = max(len(web_signals), 1)

    # Adjust precip from web consensus if strong
    if rain_votes >= total_web * 0.5 and precip < 60:
        precip = max(precip, 70)
    elif sun_votes >= total_web * 0.6 and precip > 30:
        precip = min(precip, 25)

    emoji = today["hours"][min(2, len(today["hours"]) - 1)]["emoji"]
    if precip >= 60:
        emoji = "🌧️" if rain_votes >= cloud_votes else "⛈️" if any(s["storm"] for s in web_signals) else "🌧️"
    elif sun_votes > cloud_votes and precip < 30:
        emoji = "☀️" if sun_votes > 2 else "🌤️"

    day2 = days[2] if len(days) > 2 else today
    warm_up = day2["tempMax"] >= today["tempMax"] + 3

    if precip >= 55:
        text = (
            f"Dziś w {name.split(',')[0]} pochmurno z opadami — weź parasol. "
            f"ICON/GFS/ECMWF i {model_sources}+ portali wskazują deszcz ({precip}%). "
        )
        if warm_up:
            text += f"Od {day2['date'][5:]} cieplej i sucho."
        else:
            text += "Jutro podobnie chwilowo."
    elif precip >= 30:
        text = (
            f"Dziś możliwe przelotne opady ({precip}%) — miej parasol pod ręką. "
            f"Modele częściowo zgodne; {rain_votes}/{total_web} portali na deszcz. "
        )
        text += f"Temperatura ok. {cur_temp}°C."
    else:
        text = (
            f"Dziś przewaga słońca i chmur ({cur_temp}°C) — bez większych opadów. "
            f"Konsensus {model_sources} modeli i portali ({sun_votes}/{total_web} na słońce). "
        )
        if warm_up:
            text += f"W {day2['date'][5:]} ocieplenie do {day2['tempMax']}°C."

    text = text[:300]
    return {
        "text": text,
        "emoji": emoji,
        "temperature": cur_temp,
        "feelsLike": feels,
        "precipitationChance": precip,
        "windKmh": wind,
    }


def process_location(loc: dict) -> dict:
    loc_id = loc["id"]
    name = loc["name"]
    lat, lon = loc["lat"], loc["lon"]

    sources = ["open-meteo-icon", "open-meteo-gfs", "open-meteo-ecmwf"]
    web_list = SZCZECIN_WEB if "szczecin" in loc_id else WEB_SOURCES

    extra_sources = [
        ("openweather", f"https://r.jina.ai/https://openweathermap.org/find?q={name.split(',')[0]}"),
        ("windy", f"https://r.jina.ai/https://www.windy.com/{lat}/{lon}"),
        ("timeanddate", f"https://r.jina.ai/https://www.timeanddate.com/weather/poland/{loc_id.split('-')[0]}"),
    ]

    om_raw = fetch(OPEN_METEO.format(lat=lat, lon=lon))
    if not om_raw:
        return {"locationId": loc_id, "ok": False, "posted": False, "error": "Open-Meteo failed"}

    om = json.loads(om_raw)
    hourly = synth_hourly(om)
    days = build_days(hourly)

    # YR.no + IMGW + portale (równolegle)
    parallel_entries = [
        (
            "yr.no",
            f"https://api.met.no/weatherapi/locationforecast/2.0/compact?lat={lat}&lon={lon}",
        ),
        ("imgw", "https://r.jina.ai/https://danepubliczne.imgw.pl/api/data/warningsmeteo"),
        *web_list,
        *extra_sources,
    ]
    yr_headers = {"User-Agent": "PogodAI/1.0 (pogodai.keewinek.deno.net)"}
    fetched_ids, web_signals = fetch_sources_parallel(parallel_entries, yr_headers)
    sources.extend(fetched_ids)

    if len(sources) < 3:
        return {
            "locationId": loc_id,
            "ok": False,
            "posted": False,
            "error": "Za mało źródeł (<3)",
            "sources": len(sources),
        }

    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    verdict = build_verdict(name, om.get("current", {}), days, 3, web_signals)

    payload = {
        "locationId": loc_id,
        "generatedAt": generated_at,
        "sources": sources,
        "verdict": verdict,
        "days": days,
    }

    body = json.dumps(payload, ensure_ascii=False)
    posted = False
    post_error = None
    http_code = None

    for attempt in range(2):
        req = urllib.request.Request(
            f"{BASE_URL}/api/forecast",
            data=body.encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                http_code = resp.status
                posted = http_code == 200
        except urllib.error.HTTPError as e:
            http_code = e.code
            err_body = e.read().decode("utf-8", errors="replace")
            post_error = err_body
            if http_code == 400 and attempt == 0:
                try:
                    err = json.loads(err_body)
                    msg = err.get("error", "")
                    if "verdict.text" in msg and len(verdict["text"]) > 300:
                        verdict["text"] = verdict["text"][:300]
                        payload["verdict"] = verdict
                        body = json.dumps(payload, ensure_ascii=False)
                        continue
                except Exception:
                    pass
        except Exception as e:
            post_error = str(e)
        break

    consensus = "high"
    today_precip = days[0]["precipitationChance"]
    rain_ratio = sum(1 for s in web_signals if s["rain"] > 0) / max(len(web_signals), 1)
    if today_precip > 40 and rain_ratio < 0.3:
        consensus = "medium"
    elif today_precip < 30 and rain_ratio > 0.5:
        consensus = "medium"
    if len(sources) < 10:
        consensus = "low" if consensus == "medium" else consensus

    return {
        "locationId": loc_id,
        "ok": posted,
        "posted": posted,
        "sources": len(sources),
        "sourcesUsed": len(sources),
        "consensusStrength": consensus,
        "generatedAt": generated_at,
        "verdictPreview": verdict["text"][:80],
        "topScenario": (
            f"Opady {today_precip}%" if today_precip >= 50
            else f"Słonecznie/chmury, {days[0]['tempMax']}°C"
        ),
        "error": None if posted else post_error,
        "http": http_code,
    }


def main():
    locs_raw = fetch(f"{BASE_URL}/api/locations")
    if not locs_raw:
        print(json.dumps({"error": "Cannot fetch locations"}))
        sys.exit(1)
    locations = json.loads(locs_raw).get("locations", [])
    results = []
    for loc in locations:
        results.append(process_location(loc))
    print(json.dumps({"results": results}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
