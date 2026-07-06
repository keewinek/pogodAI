import { useEffect, useRef, useState } from "preact/hooks";
import type { DayForecast, Location } from "../lib/db.ts";
import { dayEmoji, dayPrecip, dayTemps, dayWind } from "../lib/display.ts";
import { HourlyStrip } from "../components/forecast.tsx";

const STORAGE_KEY = "pogodai_location";

export function LocationPicker(
  { locations, currentId }: { locations: Location[]; currentId: string },
) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = locations.find((l) => l.id === currentId);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, currentId);
  }, [currentId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    addEventListener("keydown", onKey);
    addEventListener("click", onClick);
    return () => {
      removeEventListener("keydown", onKey);
      removeEventListener("click", onClick);
    };
  }, [open]);

  const choose = (id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    location.href = "/" + id;
  };

  return (
    <div class="relative flex justify-center pt-2" ref={ref}>
      <button
        type="button"
        aria-label="Zmień lokalizację"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        class="location-picker-btn"
      >
        <span>{current?.name ?? "Nieznana lokalizacja"}</span>
        <span
          class={`chevron chevron-down transition-transform ${
            open ? "rotate-[225deg]" : ""
          }`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div class="location-picker-menu absolute top-full mt-2 z-20 w-72 max-w-[90vw] py-1">
          {locations.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => choose(l.id)}
              class={`location-picker-row w-full text-left text-[17px] ${
                l.id === currentId
                  ? "font-semibold text-primary"
                  : "text-primary"
              }`}
            >
              {l.name}
              {l.id === currentId && (
                <span class="ml-auto text-[13px] muted font-normal">
                  Aktywna
                </span>
              )}
            </button>
          ))}
          <a
            href="/lokalizacje"
            class="location-picker-row w-full text-[15px] muted"
          >
            Edytuj lokalizacje
            <span class="chevron ml-auto" aria-hidden="true" />
          </a>
        </div>
      )}
    </div>
  );
}

export function LocationGate({ locations }: { locations: Location[] }) {
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    if (locations.some((l) => l.id === saved)) {
      location.replace("/" + saved);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [locations]);

  const choose = (id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    location.href = "/" + id;
  };

  if (locations.length === 0) {
    return (
      <div class="text-center grouped-panel grouped-panel-padded">
        <p class="text-[17px] muted-strong">Brak lokalizacji</p>
        <a href="/lokalizacje" class="btn-primary inline-flex mt-6">
          Dodaj pierwszą
        </a>
      </div>
    );
  }

  return (
    <div class="grouped-panel grouped-divider">
      {locations.map((l) => (
        <button
          key={l.id}
          type="button"
          onClick={() => choose(l.id)}
          class="grouped-row grouped-row-interactive w-full text-left text-[17px] font-medium"
        >
          {l.name}
          <span class="chevron ml-auto" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

export function NotFoundCleanup() {
  useEffect(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);
  return null;
}

export function DailyAccordion(
  {
    days,
    labels,
    todayDate,
  }: { days: DayForecast[]; labels: string[]; todayDate: string },
) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div class="daily-list">
      {days.map((day, i) => {
        const open = openIdx === i;
        const isToday = day.date === todayDate;
        const { min: tempMin, max: tempMax } = dayTemps(day);
        const precip = dayPrecip(day);
        const wind = dayWind(day);
        const rowEmoji = dayEmoji(day);
        return (
          <div key={day.date}>
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpenIdx(open ? null : i)}
              class={`daily-row ${isToday ? "daily-row-today" : ""}`}
            >
              <span class="daily-date">{labels[i]}</span>
              <span class="daily-emoji" aria-hidden="true">{rowEmoji}</span>
              <span class="daily-temp-low">{Math.round(tempMin)}°</span>
              <span class="daily-temp-high">{Math.round(tempMax)}°</span>
              <span class="daily-row-end">
                <span
                  class={`daily-precip ${precip > 0 ? "daily-precip-wet" : ""}`}
                >
                  {precip > 0 ? `${Math.round(precip)}%` : "—"}
                </span>
                <span
                  class={`chevron transition-transform duration-200 ${
                    open ? "rotate-[135deg]" : "chevron-down"
                  }`}
                  aria-hidden="true"
                />
              </span>
            </button>
            {open && (
              <div class="daily-detail">
                <HourlyStrip hours={day.hours} embedded />
                <p class="daily-wind">
                  Wiatr do {Math.round(wind)} km/h
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function LocationEditor(
  { initialLocations }: { initialLocations: Location[] },
) {
  const [locations, setLocations] = useState(initialLocations);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    { name: string; lat: number; lon: number }[]
  >([]);
  const [selected, setSelected] = useState<
    { name: string; lat: number; lon: number } | null
  >(null);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [message, setMessage] = useState<
    { kind: "ok" | "error"; text: string } | null
  >(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || (selected && q === selected.name)) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/locations/search?q=${encodeURIComponent(q)}`,
        );
        if (q !== query.trim()) return;
        const data = await res.json();
        if (!res.ok) {
          setResults([]);
          setMessage({
            kind: "error",
            text: data.error ?? "Błąd wyszukiwania.",
          });
          return;
        }
        setResults(data.results ?? []);
      } catch {
        if (q !== query.trim()) return;
        setResults([]);
        setMessage({ kind: "error", text: "Błąd sieci — spróbuj ponownie." });
      } finally {
        if (q === query.trim()) setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, selected]);

  const pick = (place: { name: string; lat: number; lon: number }) => {
    setSelected(place);
    setQuery(place.name);
    setResults([]);
    setMessage(null);
  };

  const useGps = () => {
    setMessage(null);
    if (!navigator.geolocation) {
      setMessage({
        kind: "error",
        text: "Przeglądarka nie obsługuje lokalizacji GPS.",
      });
      return;
    }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `/api/locations/search?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`,
          );
          const data = await res.json();
          if (!res.ok || !data.results?.[0]) {
            setMessage({
              kind: "error",
              text: data.error ?? "Nie udało się rozpoznać miejsca.",
            });
            return;
          }
          pick(data.results[0]);
          setMessage({ kind: "ok", text: "Wczytano lokalizację z GPS." });
        } catch {
          setMessage({ kind: "error", text: "Błąd sieci — spróbuj ponownie." });
        } finally {
          setGpsBusy(false);
        }
      },
      (err) => {
        const texts: Record<number, string> = {
          1: "Brak dostępu do lokalizacji — zezwól w ustawieniach przeglądarki.",
          2: "Nie udało się ustalić pozycji.",
          3: "Przekroczono czas oczekiwania na GPS.",
        };
        setMessage({
          kind: "error",
          text: texts[err.code] ?? "Nie udało się pobrać lokalizacji GPS.",
        });
        setGpsBusy(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60_000 },
    );
  };

  const add = async () => {
    if (!selected) {
      setMessage({
        kind: "error",
        text: "Wybierz miejscowość z listy lub GPS.",
      });
      return;
    }
    setMessage(null);
    setBusy(true);
    try {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selected.name,
          lat: selected.lat,
          lon: selected.lon,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({
          kind: "error",
          text: data.error ?? "Nie udało się dodać lokalizacji.",
        });
        return;
      }
      setLocations([...locations, data]);
      setQuery("");
      setSelected(null);
      setResults([]);
      setMessage({
        kind: "ok",
        text: "Dodano. Prognoza pojawi się w ciągu godziny.",
      });
    } catch {
      setMessage({ kind: "error", text: "Błąd sieci — spróbuj ponownie." });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (loc: Location) => {
    if (!confirm(`Usunąć lokalizację „${loc.name}"?`)) return;
    if (removingId) return;
    setMessage(null);
    setRemovingId(loc.id);
    try {
      const res = await fetch(`/api/locations/${loc.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage({
          kind: "error",
          text: data.error ?? "Nie udało się usunąć.",
        });
        return;
      }
      setLocations(locations.filter((l) => l.id !== loc.id));
      if (localStorage.getItem(STORAGE_KEY) === loc.id) {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      setMessage({ kind: "error", text: "Błąd sieci — spróbuj ponownie." });
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div class="flex flex-col gap-6">
      <section>
        <h2 class="section-label">Zapisane</h2>
        {locations.length === 0
          ? (
            <p class="text-[15px] muted-strong px-1">
              Brak lokalizacji.
            </p>
          )
          : (
            <div class="grouped-panel grouped-divider">
              {locations.map((l) => (
                <div key={l.id} class="grouped-row">
                  <p class="flex-1 min-w-0 text-[17px] font-medium truncate">
                    {l.name}
                  </p>
                  <button
                    type="button"
                    aria-label={`Usuń lokalizację ${l.name}`}
                    onClick={() => remove(l)}
                    disabled={removingId === l.id}
                    class="btn-danger shrink-0"
                  >
                    {removingId === l.id ? "Usuwam…" : "Usuń"}
                  </button>
                </div>
              ))}
            </div>
          )}
      </section>

      <section>
        <h2 class="section-label">Dodaj</h2>
        <div class="grouped-panel grouped-panel-padded flex flex-col gap-3">
          <input
            type="search"
            value={query}
            onInput={(e) => {
              const value = (e.target as HTMLInputElement).value;
              setQuery(value);
              if (selected && value !== selected.name) setSelected(null);
              setMessage(null);
            }}
            placeholder="Szukaj miasta…"
            class="field"
            autocomplete="off"
          />

          {searching && <p class="text-[14px] muted px-1">Szukam…</p>}

          {results.length > 0 && (
            <ul class="search-results">
              {results.map((place) => (
                <li key={`${place.name}-${place.lat}-${place.lon}`}>
                  <button
                    type="button"
                    onClick={() => pick(place)}
                    class="search-result-row"
                  >
                    {place.name}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={useGps}
            disabled={gpsBusy || busy}
            class="btn-secondary w-full"
          >
            {gpsBusy ? "Szukam GPS…" : "Pobierz z GPS"}
          </button>

          <button
            type="button"
            onClick={add}
            disabled={busy || gpsBusy || !selected}
            class="btn-primary w-full"
          >
            {busy ? "Dodawanie…" : "Dodaj lokalizację"}
          </button>

          {message && (
            <p
              class={`form-message ${
                message.kind === "ok" ? "form-message-ok" : "form-message-error"
              }`}
              role="status"
            >
              {message.text}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
