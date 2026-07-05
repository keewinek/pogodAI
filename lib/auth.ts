/**
 * Autoryzacja Bearer dla mutacji z automatyzacji.
 * Porównanie stałoczasowe przez porównanie hashy SHA-256.
 */
export async function requireBearer(req: Request): Promise<boolean> {
  const secret = Deno.env.get("POGODAI_SECRET");
  if (!secret) return false;

  const header = req.headers.get("Authorization");
  if (!header || !header.startsWith("Bearer ")) return false;
  const token = header.slice("Bearer ".length).trim();
  if (!token) return false;

  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(token)),
    crypto.subtle.digest("SHA-256", enc.encode(secret)),
  ]);
  return timingSafeEqual(new Uint8Array(a), new Uint8Array(b));
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
