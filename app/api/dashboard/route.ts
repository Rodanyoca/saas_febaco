import { protectedRoute } from "@/lib/auth/guard"
import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-session"
import { loadDashboardData } from "@/lib/dashboard/data"

export const dynamic = "force-dynamic"

async function GETHandler() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
  try { return NextResponse.json(await loadDashboardData(undefined, user)) }
  catch (error) {
    console.error("[dashboard] Lecture impossible", error)
    return NextResponse.json({ error: "Lecture du tableau de bord impossible." }, { status: 503 })
  }
}

export const GET = protectedRoute(GETHandler)
