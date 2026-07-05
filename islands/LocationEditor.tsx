import { useState } from "preact/hooks";
import type { Location } from "../lib/types.ts";

/** Lista lokalizacji z usuwaniem + formularz dodawania. */
export default function LocationEditor(
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
    const latNum = parseFloat(lat.replace(",", "."));
    const lonNum = parseFloat(lon.replace(",", "."));
    if (!name.trim()) {
      setMessage({ kind: "error", text: "Podaj nazwę lokalizacji." });
      return;
    }
    if (Number.isNaN(latNum) || Number.isNaN(lonNum)) {
      setMessage({
        kind: "error",
        text: "Podaj poprawne współrzędne (liczby).",
      });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), lat: latNum, lon: lonNum }),
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
        text:
          "✅ Dodano. Prognoza pojawi się po następnym cyklu automatyzacji (do 1h).",
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
    <div class="flex flex-col gap-6">
      {locations.length === 0
        ? (
          <p class="text-white/70 text-center">
            Brak lokalizacji — dodaj pierwszą poniżej.
          </p>
        )
        : (
          <ul class="rounded-3xl bg-white/10 backdrop-blur border border-white/15 overflow-hidden divide-y divide-white/10">
            {locations.map((l) => (
              <li key={l.id} class="flex items-center gap-3 px-4 py-3">
                <span class="flex-1 font-medium">📍 {l.name}</span>
                <span class="text-xs text-white/50">
                  {l.lat.toFixed(2)}, {l.lon.toFixed(2)}
                </span>
                <button
                  type="button"
                  aria-label={`Usuń lokalizację ${l.name}`}
                  onClick={() =>
                    remove(l)}
                  class="rounded-xl px-3 py-2 min-h-11 hover:bg-red-500/20 transition"
                >
                  🗑️
                </button>
              </li>
            ))}
          </ul>
        )}

      <form
        onSubmit={add}
        class="rounded-3xl bg-white/10 backdrop-blur border border-white/15 p-5 flex flex-col gap-3"
      >
        <h2 class="font-semibold">Dodaj lokalizację</h2>
        <label class="flex flex-col gap-1 text-sm">
          <span class="text-white/70">Nazwa</span>
          <input
            type="text"
            value={name}
            maxLength={60}
            onInput={(e) => setName((e.target as HTMLInputElement).value)}
            placeholder="np. Zakopane"
            class="rounded-xl bg-white/10 border border-white/20 px-3 py-2.5 placeholder-white/40 focus:outline-none focus:border-white/50"
          />
        </label>
        <div class="grid grid-cols-2 gap-3">
          <label class="flex flex-col gap-1 text-sm">
            <span class="text-white/70">Szerokość (lat)</span>
            <input
              type="text"
              inputmode="decimal"
              value={lat}
              onInput={(e) => setLat((e.target as HTMLInputElement).value)}
              placeholder="49.30"
              class="rounded-xl bg-white/10 border border-white/20 px-3 py-2.5 placeholder-white/40 focus:outline-none focus:border-white/50"
            />
          </label>
          <label class="flex flex-col gap-1 text-sm">
            <span class="text-white/70">Długość (lon)</span>
            <input
              type="text"
              inputmode="decimal"
              value={lon}
              onInput={(e) => setLon((e.target as HTMLInputElement).value)}
              placeholder="19.95"
              class="rounded-xl bg-white/10 border border-white/20 px-3 py-2.5 placeholder-white/40 focus:outline-none focus:border-white/50"
            />
          </label>
        </div>
        <p class="text-xs text-white/50">
          Współrzędne znajdziesz w Google Maps (PPM na mapie → współrzędne).
        </p>
        <button
          type="submit"
          disabled={busy}
          class="rounded-2xl bg-white/20 px-5 py-3 font-medium hover:bg-white/30 transition disabled:opacity-50 min-h-11"
        >
          {busy ? "Dodawanie…" : "+ Dodaj"}
        </button>
        {message && (
          <p
            class={`text-sm ${
              message.kind === "ok" ? "text-emerald-300" : "text-red-300"
            }`}
          >
            {message.text}
          </p>
        )}
      </form>
    </div>
  );
}
