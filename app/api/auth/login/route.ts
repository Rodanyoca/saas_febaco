import { readAuthJson } from "@/lib/auth/request-body"
import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { createSession } from "@/lib/auth-session"
import { attemptState, recordAttempt, progressiveDelay, waitForDelay } from "@/lib/auth/attempts"
import { isMutationOriginAllowed } from "@/lib/auth/request-origin"
import { sessionSecret } from "@/lib/auth/config"
import { hashPassword, verifyPassword } from "@/lib/auth/password"
import { postLoginRoute } from "@/lib/auth/post-login-route"
import { getTelemetryKey, pseudonymizeTelemetry } from "@/lib/auth/telemetry-hash"
import { AUDIT_ACTIONS } from "@/lib/audit/actions"
import { writeAudit } from "@/lib/audit/logger"
import { getAuthenticationSnapshot } from "@/lib/users/data"

const denied = () => NextResponse.json({ error: "Les informations saisies ne permettent pas d’accéder au système." }, { status: 401 })
const dummyHash = hashPassword(randomUUID())

function clientAddress(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim() || "adresse-indisponible"
}

export async function POST(request: Request) {
  if (!isMutationOriginAllowed(request)) return NextResponse.json({ error: "Origine refusee." }, { status: 403 })
  let body: { email?: unknown; password?: unknown }
  try { body = await readAuthJson(request) as { email?: unknown; password?: unknown } } catch { return NextResponse.json({ error: "Requête invalide." }, { status: 400 }) }
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Requête invalide." }, { status: 400 })
  const email = typeof body.email === "string" ? body.email.trim() : "", password = typeof body.password === "string" ? body.password : ""
  if (!email || !password || email.length > 254 || password.length > 1024) return NextResponse.json({ error: "Requête invalide." }, { status: 400 })

  const now = new Date(), requestId = randomUUID()
  try {
    sessionSecret()
    const telemetryKey = getTelemetryKey()
    const identifiantHash = pseudonymizeTelemetry(email, telemetryKey), ipHash = pseudonymizeTelemetry(clientAddress(request), telemetryKey)
    const { attempts, user, authorizations, adapter } = await getAuthenticationSnapshot(email)
    const state = attemptState(attempts, identifiantHash, ipHash, now)
    if (state.blocked) {
      await Promise.all([
        recordAttempt({ adapter, identifiantHash, ipHash, result: "REFUS_BLOCAGE_TEMPORAIRE", requestId, now }),
        writeAudit({ adapter, action: AUDIT_ACTIONS.LOGIN, typeObjet: "SESSION", result: "ECHEC", requestId, details: { motif: "REFUS_GENERIQUE" }, now }),
      ])
      await waitForDelay(state.delayMs)
      return denied()
    }

    const passwordMatches = await verifyPassword(password, user?.passwordHash ?? await dummyHash)
    const temporaryAccessValid = !user?.doitChangerMotDePasse || Boolean(user.dateExpirationAccesTemporaire && Date.parse(user.dateExpirationAccesTemporaire) > now.getTime())
    const accepted = Boolean(user && user.statut === "ACTIF" && temporaryAccessValid && passwordMatches)
    if (!accepted) {
      await Promise.all([
        recordAttempt({ adapter, identifiantHash, ipHash, result: "ECHEC", requestId, now }),
        writeAudit({ adapter, actorId: user?.idUser, action: AUDIT_ACTIONS.LOGIN, typeObjet: "SESSION", objectId: user?.idUser, result: "ECHEC", requestId, details: { motif: "REFUS_GENERIQUE" }, now }),
      ])
      await waitForDelay(progressiveDelay(state.failures + 1))
      return denied()
    }
    if (!user) throw new Error("État de connexion incohérent.")

    await recordAttempt({ adapter, identifiantHash, ipHash, result: "SUCCES", requestId, now })
    await writeAudit({ adapter, actorId: user.idUser, action: AUDIT_ACTIONS.LOGIN, typeObjet: "SESSION", objectId: user.idUser, result: "SUCCES", requestId, now })
    await adapter.updateRow!("USERS", "id_user", user.idUser, { derniere_connexion: now.toISOString() })
    await createSession({ idUser: user.idUser, sessionVersion: user.sessionVersion })
    return NextResponse.json({ ok: true, redirectTo: postLoginRoute(user, authorizations) })
  } catch (error) {
    console.error("[auth/login] Service indisponible")
    return NextResponse.json({ error: "Le service de connexion est momentanement indisponible." }, { status: 503 })
  }
}
