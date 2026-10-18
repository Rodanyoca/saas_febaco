import { protectedRoute } from "@/lib/auth/guard"
import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-session"
import { listActors } from "@/lib/actors"
import { handleActorWrite } from "@/app/api/_actor-write"
import { readSheetRows } from "@/lib/google-sheets"
import { actorLicenceIndex } from "@/lib/coach-licence-index"
export const dynamic="force-dynamic"
async function GETHandler(request: Request) {
  if (!await getSessionUser()) return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
  try {
    const params = new URL(request.url).searchParams, id = params.get("id")?.trim().toLowerCase(), search = params.get("search")?.trim().toLowerCase()
    const [rows, licences, statuses] = await Promise.all([
      listActors("arbitres"),
      id ? Promise.resolve([]) : readSheetRows({ block: "licences", sheet: "ACTEURS_LICENCES", range: "A:J" }),
      id ? Promise.resolve([]) : readSheetRows({ block: "referentiel", sheet: "STATUT_LICENCE", range: "A:D" }),
    ])
    const index = actorLicenceIndex(licences, statuses, "TAC004")
    let actors: Array<Record<string, string | boolean>> = rows.filter(actor => !id || actor.id.toLowerCase() === id).map(actor => ({ ...actor, ...(!id ? index.get(actor.id) || { licenceNumero: "", licenceDisplay: "", licenceAmbiguous: false } : {}) }))
    if (search) actors = actors.filter(actor => Object.values(actor).filter(value => typeof value === "string").join(" ").toLowerCase().includes(search))
    return NextResponse.json({ arbitres: actors })
  } catch (error) {
    return NextResponse.json({ arbitres: [], error: error instanceof Error ? error.message : "Lecture impossible." }, { status: 500 })
  }
}
async function POSTHandler(request:Request){return handleActorWrite(request,"arbitres","create")}

export const GET = protectedRoute(GETHandler)
export const POST = protectedRoute(POSTHandler)
