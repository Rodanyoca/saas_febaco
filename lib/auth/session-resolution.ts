import type { User } from "../users/types"
import { verifySessionToken, type SignedSessionPayload } from "./session-token"

export type SessionFailure = "INVALID_SESSION" | "USER_NOT_FOUND" | "USER_DISABLED" | "TEMP_ACCESS_EXPIRED" | "SESSION_REVOKED" | "SOURCE_UNAVAILABLE"
export type SessionResolution =
  | { ok: true; payload: SignedSessionPayload; user: User; requiresActivation: boolean }
  | { ok: false; reason: SessionFailure }

export async function resolveSession(input: { token: string; secret: string; loadUser: (idUser: string) => Promise<User | null>; nowSeconds?: number }): Promise<SessionResolution> {
  const payload = await verifySessionToken(input)
  if (!payload) return { ok: false, reason: "INVALID_SESSION" }
  try {
    const user = await input.loadUser(payload.id_user)
    if(payload.exp <= (input.nowSeconds ?? Math.floor(Date.now()/1000)))return {ok:false,reason:"INVALID_SESSION"}
    if (!user) return { ok: false, reason: "USER_NOT_FOUND" }
    if (user.statut !== "ACTIF") return { ok: false, reason: "USER_DISABLED" }
    if (user.sessionVersion !== payload.session_version) return { ok: false, reason: "SESSION_REVOKED" }
    if ((user.doitChangerMotDePasse && !user.dateExpirationAccesTemporaire) || (user.dateExpirationAccesTemporaire && Date.parse(user.dateExpirationAccesTemporaire) <= (input.nowSeconds ?? Math.floor(Date.now() / 1000)) * 1000)) {
      return { ok: false, reason: "TEMP_ACCESS_EXPIRED" }
    }
    return { ok: true, payload, user, requiresActivation: user.doitChangerMotDePasse }
  } catch {
    return { ok: false, reason: "SOURCE_UNAVAILABLE" }
  }
}
