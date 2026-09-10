import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-session"
import { mutateTerritorial, TerritorialError, type TerritorialKind } from "@/lib/territorial"

export async function handleTerritorialWrite(request: Request, kind: TerritorialKind, mode: "create"|"update", id?: string) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: { code: "NON_AUTHENTIFIE", message: "Authentification requise." } }, { status: 401 })
  if (user.role !== "federal") return NextResponse.json({ error: { code: "ECRITURE_REFUSEE", message: "Vous ne disposez pas du droit d’écriture." } }, { status: 403 })
  try {
    const body = await request.json().catch(() => null)
    const entity = await mutateTerritorial(kind, mode, body, id)
    return NextResponse.json({ entity }, { status: mode === "create" ? 201 : 200 })
  } catch (error) {
    if (error instanceof TerritorialError) return NextResponse.json({ error: { code: error.code, message: error.message, fields: error.fields } }, { status: error.status })
    return NextResponse.json({ error: { code: "SERVICE_INDISPONIBLE", message: "Service temporairement indisponible." } }, { status: 503 })
  }
}
