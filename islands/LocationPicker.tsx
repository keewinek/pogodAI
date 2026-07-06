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
