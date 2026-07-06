import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { DayForecast, Location } from "../lib/types.ts";
import { dayTemps } from "../lib/display.ts";
import { HourlyStrip } from "../components/forecast.tsx";

const STORAGE_KEY = "pogodai_location";

interface GeocodePlace {
  name: string;
  lat: number;
  lon: number;
}

function tempBarStyle(
  tempMin: number,
  tempMax: number,
  globalMin: number,
  globalMax: number,
): { left: string; width: string } {
  const span = globalMax - globalMin || 1;
  return {
    left: `${((tempMin - globalMin) / span) * 100}%`,
    width: `${Math.max(((tempMax - tempMin) / span) * 100, 8)}%`,
  };
}

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
        class="btn-pill"
      >
        <span>{current?.name ?? currentId}</span>
        <span
          class={`chevron chevron-down transition-transform ${
            open ? "rotate-[225deg]" : ""
          }`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div class="absolute top-full mt-2 z-20 w-72 max-w-[90vw] grouped py-1">
          {locations.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => choose(l.id)}
              class={`grouped-row w-full text-left text-[17px] transition hover:bg-white/5 ${
                l.id === currentId
                  ? "font-semibold text-white"
                  : "text-white/85"
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
            class="grouped-row w-full text-[15px] muted hover:bg-white/5 transition"
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
  }, []);

  const choose = (id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    location.href = "/" + id;
  };

  if (locations.length === 0) {
    return (
      <div class="text-center grouped px-6 py-10">
        <p class="text-[17px] muted-strong">Brak lokalizacji</p>
        <a href="/lokalizacje" class="btn-primary inline-flex mt-6">
          Dodaj pierwszą
        </a>
      </div>
    );
  }

  return (
    <div class="grouped grouped-divider">
      {locations.map((l) => (
        <button
          key={l.id}
          type="button"
          onClick={() => choose(l.id)}
          class="grouped-row w-full text-left text-[17px] font-medium transition hover:bg-white/[0.04]"
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
  { days, labels }: { days: DayForecast[]; labels: string[] },
) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const { globalMin, globalMax } = useMemo(() => {
    const ranges = days.map((d) => dayTemps(d));
    return {
      globalMin: Math.min(...ranges.map((r) => r.min)),
      globalMax: Math.max(...ranges.map((r) => r.max)),
    };
  }, [days]);

  return (
    <div class="grouped grouped-divider">
      {days.map((day, i) => {
        const open = openIdx === i;
        const { min: tempMin, max: tempMax } = dayTemps(day);
        const bar = tempBarStyle(tempMin, tempMax, globalMin, globalMax);
        return (
          <div key={day.date}>
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpenIdx(open ? null : i)}
              class={`grouped-row w-full text-left transition hover:bg-white/[0.04] py-3 ${
                labels[i] === "Dziś" ? "font-semibold" : ""
              }`}
            >
              <span class="w-[3.25rem] shrink-0 text-[17px]">{labels[i]}</span>
              <span
                class="text-[20px] leading-none select-none shrink-0"
                aria-hidden="true"
              >
                {day.emoji}
              </span>
              <div class="flex-1 flex items-center gap-2 min-w-0 mx-1">
                <span class="text-[15px] muted tabular-nums w-7 text-right shrink-0">
                  {Math.round(tempMin)}°
                </span>
                <div class="temp-range-track flex-1 min-w-[3rem]">
                  <div
                    class="temp-range-fill"
                    style={{ left: bar.left, width: bar.width }}
                  />
                </div>
                <span class="text-[15px] tabular-nums w-7 shrink-0">
                  {Math.round(tempMax)}°
                </span>
              </div>
              <span class="w-9 shrink-0 text-right text-[14px] muted tabular-nums">
                {day.precipitationChance > 0
                  ? `${Math.round(day.precipitationChance)}%`
                  : "—"}
              </span>
              <span
                class={`chevron transition-transform duration-200 ${
                  open ? "rotate-[135deg]" : "chevron-down"
                }`}
                aria-hidden="true"
              />
            </button>
            {open && (
              <div class="px-4 pb-4 pt-2 border-t border-white/[0.08]">
                <p class="text-[15px] muted-strong leading-relaxed mb-4">
                  {day.summary}
                </p>
                <HourlyStrip hours={day.hours} embedded />
                <p class="mt-3 text-[13px] muted tabular-nums">
                  Wiatr do {Math.round(day.windKmh)} km/h
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
  const [suggestions, setSuggestions] = useState<GeocodePlace[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<GeocodePlace | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<
    { kind: "ok" | "error"; text: string } | null
  >(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!searchOpen) return;
    const onClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    addEventListener("click", onClick);
    return () => removeEventListener("click", onClick);
  }, [searchOpen]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = globalThis.setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (res.ok) {
          setSuggestions(data.results ?? []);
          setSearchOpen(true);
        } else setSuggestions([]);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const pick = (place: GeocodePlace) => {
    setSelected(place);
    setQuery(place.name);
    setSuggestions([]);
    setSearchOpen(false);
    setMessage(null);
  };

  const useGps = () => {
    if (!navigator.geolocation) {
      setMessage({
        kind: "error",
        text: "Twoja przeglądarka nie obsługuje geolokalizacji.",
      });
      return;
    }
    setGpsBusy(true);
    setMessage(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `/api/geocode?lat=${latitude}&lon=${longitude}`,
          );
          const data = await res.json();
          if (!res.ok) {
            setMessage({
              kind: "error",
              text: data.error ?? "Nie udało się rozpoznać lokalizacji.",
            });
            return;
          }
          pick(data.place);
        } catch {
          setMessage({ kind: "error", text: "Błąd sieci — spróbuj ponownie." });
        } finally {
          setGpsBusy(false);
        }
      },
      (err) => {
        setGpsBusy(false);
        const text = err.code === err.PERMISSION_DENIED
          ? "Brak dostępu do lokalizacji — zezwól w ustawieniach przeglądarki."
          : err.code === err.POSITION_UNAVAILABLE
          ? "Nie udało się ustalić pozycji GPS."
          : "Przekroczono czas oczekiwania na GPS.";
        setMessage({ kind: "error", text });
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  };

  const add = async (e: Event) => {
    e.preventDefault();
    setMessage(null);
    if (!selected) {
      setMessage({
        kind: "error",
        text: "Wyszukaj miejscowość na liście albo użyj GPS.",
      });
      return;
    }
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
    setMessage(null);
    try {
      const res = await fetch(`/api/locations/${loc.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
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
    }
  };

  return (
    <div class="flex flex-col gap-8">
      {locations.length === 0
        ? (
          <p class="text-[15px] muted text-center">
            Brak lokalizacji — dodaj pierwszą poniżej.
          </p>
        )
        : (
          <div class="grouped grouped-divider">
            {locations.map((l) => (
              <div key={l.id} class="grouped-row">
                <div class="flex-1 min-w-0">
                  <p class="text-[17px] font-medium truncate">{l.name}</p>
                  <p class="text-[13px] muted tabular-nums mt-0.5">
                    {l.lat.toFixed(2)}°, {l.lon.toFixed(2)}°
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Usuń lokalizację ${l.name}`}
                  onClick={() => remove(l)}
                  class="btn-ghost text-[15px] text-red-400/90 hover:text-red-300 shrink-0"
                >
                  Usuń
                </button>
              </div>
            ))}
          </div>
        )}

      <form onSubmit={add} class="grouped p-5 flex flex-col gap-4">
        <h2 class="text-[13px] font-semibold muted uppercase tracking-wide">
          Dodaj
        </h2>
        <button
          type="button"
          onClick={useGps}
          disabled={gpsBusy || busy}
          class="btn-pill w-full disabled:opacity-40"
        >
          {gpsBusy ? "Szukam lokalizacji…" : "Użyj mojej lokalizacji"}
        </button>
        <div class="relative" ref={searchRef}>
          <label class="flex flex-col gap-2">
            <span class="text-[13px] font-semibold muted">Miejscowość</span>
            <input
              type="search"
              value={query}
              autoComplete="off"
              aria-expanded={searchOpen && suggestions.length > 0}
              onFocus={() => suggestions.length > 0 && setSearchOpen(true)}
              onInput={(e) => {
                const v = (e.target as HTMLInputElement).value;
                setQuery(v);
                if (selected && v !== selected.name) setSelected(null);
              }}
              placeholder="np. Białołęka, Zakopane…"
              class="field"
            />
          </label>
          {searching && <p class="mt-1 text-[13px] muted">Szukam…</p>}
          {searchOpen && suggestions.length > 0 && (
            <ul class="absolute z-10 mt-2 w-full max-h-56 overflow-y-auto grouped py-1">
              {suggestions.map((s) => (
                <li key={`${s.lat}-${s.lon}-${s.name}`}>
                  <button
                    type="button"
                    onClick={() => pick(s)}
                    class="grouped-row w-full text-left hover:bg-white/[0.04] transition"
                  >
                    <span class="text-[17px] font-medium">{s.name}</span>
                    <span class="block text-[13px] muted tabular-nums mt-0.5">
                      {s.lat.toFixed(4)}°, {s.lon.toFixed(4)}°
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {selected && (
          <div class="rounded-[14px] bg-white/6 px-4 py-3">
            <p class="text-[15px] font-medium">{selected.name}</p>
            <p class="text-[13px] muted tabular-nums mt-0.5">
              {selected.lat.toFixed(4)}°, {selected.lon.toFixed(4)}°
            </p>
          </div>
        )}
        <button
          type="submit"
          disabled={busy || !selected}
          class="btn-primary w-full disabled:opacity-40"
        >
          {busy ? "Dodawanie…" : "Dodaj lokalizację"}
        </button>
        {message && (
          <p
            class={`text-[15px] ${
              message.kind === "ok" ? "text-emerald-400/90" : "text-red-400/90"
            }`}
          >
            {message.text}
          </p>
        )}
      </form>
    </div>
  );
}
