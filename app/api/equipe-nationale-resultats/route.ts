import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-session"
import { getResultatEquipeNationaleById, getResultatsByEquipeId, getResultatsByParticipationId, getResultatsEquipeNationale } from "@/lib/equipe-nationale-data"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    if (!(await getSessionUser())) return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
    const params = new URL(request.url).searchParams
    const id = params.get("id")?.trim()
    const equipeId = params.get("equipeId")?.trim()
    const participationId = params.get("participationId")?.trim()
    if (id) return NextResponse.json({ resultat: await getResultatEquipeNationaleById(id) ?? null })
    const resultats = participationId ? await getResultatsByParticipationId(participationId)
      : equipeId ? await getResultatsByEquipeId(equipeId) : await getResultatsEquipeNationale()
    return NextResponse.json({ resultats })
  } catch (error) {
    console.error("[api/equipe-nationale-resultats] Lecture impossible", error)
    return NextResponse.json({ resultats: [], error: "Lecture impossible." }, { status: 500 })
  }
}
