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
              class={`grouped-row grouped-row-interactive w-full text-left text-[17px] ${
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
            class="grouped-row grouped-row-interactive w-full text-[15px] muted"
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
    <div class="grouped daily-list">
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
  const [name, setName] = useState("");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<
    { kind: "ok" | "error"; text: string } | null
  >(null);

  const add = async (e: Event) => {
    e.preventDefault();
    setMessage(null);
    const latN = parseFloat(lat);
    const lonN = parseFloat(lon);
    if (!name.trim()) {
      setMessage({ kind: "error", text: "Podaj nazwę lokalizacji." });
      return;
    }
    if (!Number.isFinite(latN) || !Number.isFinite(lonN)) {
      setMessage({ kind: "error", text: "Podaj poprawne współrzędne." });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), lat: latN, lon: lonN }),
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
      setName("");
      setLat("");
      setLon("");
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
                  class="btn-ghost btn-danger shrink-0"
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
        <label class="flex flex-col gap-2">
          <span class="text-[13px] font-semibold muted">Nazwa</span>
          <input
            type="text"
            value={name}
            onInput={(e) => setName((e.target as HTMLInputElement).value)}
            placeholder="np. Białołęka, Warszawa"
            class="field"
          />
        </label>
        <div class="grid grid-cols-2 gap-3">
          <label class="flex flex-col gap-2">
            <span class="text-[13px] font-semibold muted">Lat</span>
            <input
              type="text"
              inputMode="decimal"
              value={lat}
              onInput={(e) => setLat((e.target as HTMLInputElement).value)}
              placeholder="52.32"
              class="field"
            />
          </label>
          <label class="flex flex-col gap-2">
            <span class="text-[13px] font-semibold muted">Lon</span>
            <input
              type="text"
              inputMode="decimal"
              value={lon}
              onInput={(e) => setLon((e.target as HTMLInputElement).value)}
              placeholder="20.97"
              class="field"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={busy}
          class="btn-primary w-full"
        >
          {busy ? "Dodawanie…" : "Dodaj lokalizację"}
        </button>
        {message && (
          <p
            class={`text-[15px] ${
              message.kind === "ok" ? "text-success" : "text-danger"
            }`}
          >
            {message.text}
          </p>
        )}
      </form>
    </div>
  );
}
