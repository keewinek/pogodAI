import { useEffect, useRef, useState } from "preact/hooks";
import type { Location } from "../lib/types.ts";

const STORAGE_KEY = "pogodai_location";

/** Pigułka z nazwą lokalizacji + dropdown wyboru na stronie prognozy. */
export default function LocationPicker(
  { locations, currentId }: { locations: Location[]; currentId: string },
) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = locations.find((l) => l.id === currentId);

  // Zapamiętaj bieżącą lokalizację (np. wejście z bezpośredniego linku).
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
    <div class="relative flex justify-center" ref={ref}>
      <button
        type="button"
        aria-label="Zmień lokalizację"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        class="rounded-full bg-white/15 backdrop-blur border border-white/20 px-4 py-2.5 text-sm font-medium hover:bg-white/25 transition min-h-11"
      >
        📍 {current?.name ?? currentId} <span aria-hidden="true">▾</span>
      </button>

      {open && (
        <div class="absolute top-full mt-2 z-10 w-72 max-w-[90vw] rounded-3xl bg-slate-900/95 backdrop-blur border border-white/20 shadow-xl p-2">
          {locations.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => choose(l.id)}
              class={`w-full rounded-2xl px-4 py-3 text-left text-sm min-h-11 hover:bg-white/10 transition ${
                l.id === currentId ? "bg-white/10 font-semibold" : ""
              }`}
            >
              📍 {l.name}
            </button>
          ))}
          <a
            href="/lokalizacje"
            class="block w-full rounded-2xl px-4 py-3 text-left text-sm text-white/60 hover:bg-white/10 transition min-h-11"
          >
            ⚙️ Edytuj lokalizacje…
          </a>
        </div>
      )}
    </div>
  );
}
