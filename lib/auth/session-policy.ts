const PENDING_ALLOWED = new Set(["/activation", "/api/auth/activate", "/api/auth/session", "/api/auth/logout"])

export function isPendingPasswordRouteAllowed(pathname: string): boolean {
  return PENDING_ALLOWED.has(pathname)
}
