import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-session"
import { getEquipeNationaleById, getEquipesNationales } from "@/lib/equipe-nationale-data"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    if (!(await getSessionUser())) return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
    const id = new URL(request.url).searchParams.get("id")?.trim()
    if (id) return NextResponse.json({ equipeNationale: await getEquipeNationaleById(id) ?? null })
    return NextResponse.json({ equipesNationales: await getEquipesNationales() })
  } catch (error) {
    console.error("[api/equipe-nationale] Lecture impossible", error)
    return NextResponse.json({ equipesNationales: [], error: "Lecture impossible." }, { status: 500 })
  }
}
