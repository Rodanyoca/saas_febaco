import { SESSION_TTL_SECONDS } from "./session-token"

export const SESSION_COOKIE_NAME = "febaco_session"

export function sessionCookieOptions(production: boolean) {
  return { httpOnly: true as const, secure: production, sameSite: "lax" as const, path: "/", maxAge: SESSION_TTL_SECONDS }
}
