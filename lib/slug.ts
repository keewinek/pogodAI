/** Slug z nazwy: małe litery, bez diakrytyków, spacje/znaki → "-". */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replaceAll("ł", "l")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
