function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a[i] ^ b[i];
  }
  return mismatch === 0;
}

export function requireBearer(req: Request): boolean {
  const secret = Deno.env.get("POGODAI_SECRET");
  if (!secret) return false;

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return false;

  const token = auth.slice(7);
  const encoder = new TextEncoder();
  return timingSafeEqual(encoder.encode(token), encoder.encode(secret));
}
