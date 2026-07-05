import { useEffect, useRef, useState } from "preact/hooks";
import type { Location } from "../lib/types.ts";

interface GeocodePlace {
  name: string;
  lat: number;
  lon: number;
}

/** Lista lokalizacji z usuwaniem + wyszukiwarka miejsc + GPS. */
export default function LocationEditor(
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
        const res = await fetch(
          `/api/geocode/search?q=${encodeURIComponent(q)}`,
        );
        const data = await res.json();
        if (res.ok) {
          setSuggestions(data.results ?? []);
          setSearchOpen(true);
        } else {
          setSuggestions([]);
        }
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
            `/api/geocode/reverse?lat=${latitude}&lon=${longitude}`,
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
      if (localStorage.getItem("pogodai_location") === loc.id) {
        localStorage.removeItem("pogodai_location");
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
              aria-controls="geocode-suggestions"
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
            <ul
              id="geocode-suggestions"
              role="listbox"
              class="absolute z-10 mt-2 w-full max-h-56 overflow-y-auto grouped py-1 shadow-2xl shadow-black/40"
            >
              {suggestions.map((s) => (
                <li key={`${s.lat}-${s.lon}-${s.name}`}>
                  <button
                    type="button"
                    role="option"
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
