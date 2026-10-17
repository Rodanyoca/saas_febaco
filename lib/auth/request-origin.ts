// Next may normalize loopback URLs internally. Host retains the browser's public authority.
export function publicRequestOrigin(request: Request): string {
  const internal = new URL(request.url)
  const protocol = request.headers.get("x-forwarded-proto") === "https" ? "https:" : internal.protocol
  return new URL(protocol + "//" + (request.headers.get("host") || internal.host)).origin
}
export function isMutationOriginAllowed(request: Request): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase())) return true
  const origin = request.headers.get("origin")
  if (!origin || origin === "null") return false
  try { return origin === publicRequestOrigin(request) } catch { return false }
}
