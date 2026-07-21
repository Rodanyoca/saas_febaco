import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-session"
import { getSelections, getSelectionsByEquipeId } from "@/lib/equipe-nationale-data"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    if (!(await getSessionUser())) return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
    const equipeId = new URL(request.url).searchParams.get("equipeId")?.trim()
    return NextResponse.json({ selections: equipeId ? await getSelectionsByEquipeId(equipeId) : await getSelections() })
  } catch (error) {
    console.error("[api/equipe-nationale-selections] Lecture impossible", error)
    return NextResponse.json({ selections: [], error: "Lecture impossible." }, { status: 500 })
  }
}
