import { NextResponse } from "next/server"
import { pickFirst, readSheetRows } from "@/lib/google-sheets"
import { setSessionCookie, type SessionUser } from "@/lib/auth-session"
import { normalizeRole } from "@/lib/auth-scope"
import crypto from "node:crypto"

export const dynamic = "force-dynamic"

type LoginBody = {
  email?: string
  password?: string
}

const attempts = new Map<string, { count: number; resetAt: number }>()
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 8

function requestKey(req: Request, email: string): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  return `${forwarded || "unknown"}:${email}`
}

function isRateLimited(key: string): boolean {
  const now = Date.now()
  if (attempts.size > 10_000) {
    for (const [attemptKey, attempt] of attempts) if (attempt.resetAt <= now) attempts.delete(attemptKey)
    if (attempts.size > 10_000) attempts.clear()
  }
  const current = attempts.get(key)
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 0, resetAt: now + ATTEMPT_WINDOW_MS })
    return false
  }
  return current.count >= MAX_ATTEMPTS
}

function recordFailure(key: string) {
  const current = attempts.get(key)
  attempts.set(key, { count: (current?.count ?? 0) + 1, resetAt: current?.resetAt ?? Date.now() + ATTEMPT_WINDOW_MS })
}

function safePasswordEqual(actual: string, expected: string): boolean {
  const actualHash = crypto.createHash("sha256").update(actual).digest()
  const expectedHash = crypto.createHash("sha256").update(expected).digest()
  return crypto.timingSafeEqual(actualHash, expectedHash)
}

function normalizeEmail(value: unknown): string {
  return String(value ?? "").trim().toLowerCase()
}

function normalizeStatus(value: unknown): string {
  return String(value ?? "").trim().toLowerCase()
}

export async function POST(req: Request) {
  try {
    const contentLength = Number(req.headers.get("content-length") ?? "0")
    if (contentLength > 10_000) {
      return NextResponse.json({ error: "Requête trop volumineuse." }, { status: 413 })
    }
    const body = (await req.json()) as LoginBody
    const email = normalizeEmail(body?.email)
    const password = String(body?.password ?? "").trim()

    if (!email || !password) {
      return NextResponse.json({ error: "Email et mot de passe requis." }, { status: 400 })
    }
    if (email.length > 254 || password.length > 256) {
      return NextResponse.json({ error: "Identifiants invalides." }, { status: 401 })
    }

    const attemptKey = requestKey(req, email)
    if (isRateLimited(attemptKey)) {
      return NextResponse.json({ error: "Trop de tentatives. Réessayez plus tard." }, { status: 429, headers: { "Retry-After": "900" } })
    }

    const rows = await readSheetRows("users")

    const row = rows.find((r) => {
      const candidate = normalizeEmail(pickFirst(r, ["email", "mail", "username", "login"]))
      return candidate === email
    })

    if (!row) {
      recordFailure(attemptKey)
      return NextResponse.json({ error: "Identifiants invalides." }, { status: 401 })
    }

    const statut = normalizeStatus(pickFirst(row, ["statut", "status", "etat"]))
    if (statut && statut !== "actif") {
      return NextResponse.json({ error: "Compte inactif." }, { status: 403 })
    }

    const expectedPassword = String(
      pickFirst(row, ["mot_de_passe", "mot_de_passe", "password", "mdp", "pass"])
    ).trim()

    if (!expectedPassword || !safePasswordEqual(password, expectedPassword)) {
      recordFailure(attemptKey)
      return NextResponse.json({ error: "Identifiants invalides." }, { status: 401 })
    }

    const role = normalizeRole(pickFirst(row, ["role", "profil", "type"]))
    const ligueId = pickFirst(row, ["id_ligue", "ligue_id", "ligue", "scope_ligue"])
    const ententeId = pickFirst(row, ["id_entente", "entente_id", "entente", "scope_entente"])
    const nom = pickFirst(row, ["nom", "nom_complet", "name", "utilisateur"]) || undefined

    const user: SessionUser = {
      email,
      nom,
      role,
      ligueId: role === "ligue" ? ligueId : undefined,
      ententeId: role === "entente" ? ententeId : undefined,
    }

    if (role === "ligue" && !user.ligueId) {
      return NextResponse.json({ error: "Compte ligue: id_ligue manquant." }, { status: 500 })
    }

    if (role === "entente" && !user.ententeId) {
      return NextResponse.json({ error: "Compte entente: id_entente manquant." }, { status: 500 })
    }

    await setSessionCookie(user)
    attempts.delete(attemptKey)

    return NextResponse.json({ user })
  } catch (error) {
    console.error("[api/auth/login] Connexion impossible", error)
    return NextResponse.json({ error: "Connexion impossible." }, { status: 500 })
  }
}
