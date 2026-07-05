import { useState } from "preact/hooks";
import type { Location } from "../lib/types.ts";

interface LocationEditorProps {
  initialLocations: Location[];
}

export default function LocationEditor(
  { initialLocations }: LocationEditorProps,
) {
  const [locations, setLocations] = useState(initialLocations);
  const [name, setName] = useState("");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAdd(event: Event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          lat: Number(lat),
          lon: Number(lon),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Nie udało się dodać lokalizacji");
        return;
      }

      setLocations((current) => [...current, data]);
      setName("");
      setLat("");
      setLon("");
      setMessage(
        "✅ Dodano. Prognoza pojawi się po następnym cyklu automatyzacji (do 1h).",
      );
    } catch {
      setError("Nie udało się połączyć z serwerem");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(location: Location) {
    if (!confirm(`Usunąć lokalizację ${location.name}?`)) return;

    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(`/api/locations/${location.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? "Nie udało się usunąć lokalizacji");
        return;
      }

      setLocations((current) =>
        current.filter((item) => item.id !== location.id)
      );
      setMessage(`Usunięto lokalizację ${location.name}.`);
    } catch {
      setError("Nie udało się połączyć z serwerem");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div class="space-y-6">
      <ul class="space-y-3">
        {locations.map((location) => (
          <li
            key={location.id}
            class="flex min-h-14 items-center justify-between rounded-3xl bg-white/10 px-4 py-3 backdrop-blur"
          >
            <span>📍 {location.name}</span>
            <button
              type="button"
              aria-label={`Usuń ${location.name}`}
              disabled={loading}
              onClick={() => handleDelete(location)}
              class="min-h-11 min-w-11 rounded-2xl text-lg hover:bg-white/10 disabled:opacity-50"
            >
              🗑
            </button>
          </li>
        ))}
      </ul>

      <form
        onSubmit={handleAdd}
        class="space-y-4 rounded-3xl bg-white/10 p-5 backdrop-blur"
      >
        <h2 class="text-lg font-medium">Dodaj lokalizację</h2>

        <label class="block space-y-1">
          <span class="text-sm text-white/70">Nazwa</span>
          <input
            required
            value={name}
            onInput={(event) =>
              setName((event.target as HTMLInputElement).value)}
            class="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white placeholder:text-white/40"
            placeholder="np. Białołęka, Warszawa"
          />
        </label>

        <div class="grid grid-cols-2 gap-3">
          <label class="block space-y-1">
            <span class="text-sm text-white/70">Lat</span>
            <input
              required
              type="number"
              step="any"
              value={lat}
              onInput={(event) =>
                setLat((event.target as HTMLInputElement).value)}
              class="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white"
            />
          </label>
          <label class="block space-y-1">
            <span class="text-sm text-white/70">Lon</span>
            <input
              required
              type="number"
              step="any"
              value={lon}
              onInput={(event) =>
                setLon((event.target as HTMLInputElement).value)}
              class="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white"
            />
          </label>
        </div>

        <p class="text-xs text-white/60">
          Współrzędne znajdziesz w Google Maps (PPM → współrzędne).
        </p>

        <button
          type="submit"
          disabled={loading}
          class="min-h-11 w-full rounded-2xl bg-white/20 px-4 py-3 font-medium hover:bg-white/30 disabled:opacity-50"
        >
          {loading ? "Zapisywanie…" : "+ Dodaj"}
        </button>
      </form>

      {message && <p class="text-sm text-emerald-200">{message}</p>}
      {error && <p class="text-sm text-red-200">{error}</p>}
    </div>
  );
}
