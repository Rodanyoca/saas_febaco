import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-session"
import { getCompetitionEquipeNationaleById, getCompetitionsByEquipeId, getCompetitionsEquipeNationale } from "@/lib/equipe-nationale-data"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    if (!(await getSessionUser())) return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
    const params = new URL(request.url).searchParams
    const id = params.get("id")?.trim()
    const equipeId = params.get("equipeId")?.trim()
    if (id) return NextResponse.json({ competition: await getCompetitionEquipeNationaleById(id) ?? null })
    return NextResponse.json({ competitions: equipeId ? await getCompetitionsByEquipeId(equipeId) : await getCompetitionsEquipeNationale() })
  } catch (error) {
    console.error("[api/equipe-nationale-competitions] Lecture impossible", error)
    return NextResponse.json({ competitions: [], error: "Lecture impossible." }, { status: 500 })
  }
}
