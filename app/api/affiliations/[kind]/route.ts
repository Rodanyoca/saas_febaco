import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-session"
import { listAffiliations, type AffiliationKind } from "@/lib/affiliations"
import { handleAffiliationWrite } from "@/app/api/_affiliation-write"

const kinds = new Set(["athlete", "coach", "medecin", "officiel", "autre"])
export async function GET(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  if (!await getSessionUser()) return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
  const kind = (await params).kind
  if (!kinds.has(kind)) return NextResponse.json({ error: "Type invalide." }, { status: 404 })
  const query = new URL(request.url).searchParams
  try {
    return NextResponse.json({ affiliations: await listAffiliations(kind as AffiliationKind, {
      actorId: query.get("actorId")?.trim() || undefined, equipeId: query.get("equipeId")?.trim() || undefined,
      clubId: query.get("clubId")?.trim() || undefined, typeEntiteId: query.get("typeEntiteId")?.trim() || undefined,
      entiteId: query.get("entiteId")?.trim() || undefined,
    }) })
  } catch { return NextResponse.json({ error: "Lecture impossible." }, { status: 503 }) }
}
export async function POST(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const kind = (await params).kind
  if (!kinds.has(kind)) return NextResponse.json({ error: "Type invalide." }, { status: 404 })
  return handleAffiliationWrite(request, kind as AffiliationKind, "create")
}
