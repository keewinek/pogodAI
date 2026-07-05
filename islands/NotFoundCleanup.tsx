import { useEffect } from "preact/hooks";

const STORAGE_KEY = "pogodai_location";

/** Czyści nieaktualny zapis lokalizacji po 404. */
export default function NotFoundCleanup() {
  useEffect(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);
  return null;
}
