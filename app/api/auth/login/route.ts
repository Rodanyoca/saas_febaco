import { NextResponse } from "next/server"
import { pickFirst, readSheetRows } from "@/lib/google-sheets"
import { setSessionCookie, type SessionUser } from "@/lib/auth-session"
import { normalizeRole } from "@/lib/auth-scope"

export const dynamic = "force-dynamic"

type LoginBody = {
  email?: string
  password?: string
}

function normalizeEmail(value: unknown): string {
  return String(value ?? "").trim().toLowerCase()
}

function normalizeStatus(value: unknown): string {
  return String(value ?? "").trim().toLowerCase()
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as LoginBody
    const email = normalizeEmail(body?.email)
    const password = String(body?.password ?? "").trim()

    if (!email || !password) {
      return NextResponse.json({ error: "Email et mot de passe requis." }, { status: 400 })
    }

    const rows = await readSheetRows("users")

    const row = rows.find((r) => {
      const candidate = normalizeEmail(pickFirst(r, ["email", "mail", "username", "login"]))
      return candidate === email
    })

    if (!row) {
      return NextResponse.json({ error: "Identifiants invalides." }, { status: 401 })
    }

    const statut = normalizeStatus(pickFirst(row, ["statut", "status", "etat"]))
    if (statut && statut !== "actif") {
      return NextResponse.json({ error: "Compte inactif." }, { status: 403 })
    }

    const expectedPassword = String(
      pickFirst(row, ["mot_de_passe", "mot_de_passe", "password", "mdp", "pass"])
    ).trim()

    if (!expectedPassword || expectedPassword !== password) {
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

    return NextResponse.json({ user })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
