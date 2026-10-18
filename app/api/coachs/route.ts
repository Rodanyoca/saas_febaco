import { protectedRoute } from "@/lib/auth/guard"
import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-session"
import { listActors } from "@/lib/actors"
import { handleActorWrite } from "@/app/api/_actor-write"
import { readSheetRows } from "@/lib/google-sheets"
import { coachLicenceIndex } from "@/lib/coach-licence-index"
export const dynamic="force-dynamic"
async function GETHandler(request: Request) {
  if (!await getSessionUser()) return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
  try {
    const params = new URL(request.url).searchParams, id = params.get("id")?.trim().toLowerCase(), search = params.get("search")?.trim().toLocaleLowerCase("fr")
    const [rows, licences, statuses] = await Promise.all([
      listActors("coachs"),
      id ? Promise.resolve([]) : readSheetRows({ block: "licences", sheet: "ACTEURS_LICENCES", range: "A:J" }),
      id ? Promise.resolve([]) : readSheetRows({ block: "referentiel", sheet: "STATUT_LICENCE", range: "A:D" }),
    ])
    const index = coachLicenceIndex(licences, statuses)
    let actors: Array<Record<string, string | boolean>> = rows.filter(actor => !id || actor.id.toLowerCase() === id).map(actor => ({ ...actor, ...(!id ? index.get(actor.id) || { licenceNumero: "", licenceDisplay: "", licenceAmbiguous: false } : {}) }))
    if (search) actors = actors.filter(actor => [actor.licenceDisplay, actor.nomComplet, actor.sexe, actor.niveau, actor.nationalite, actor.idNational, actor.idFiba, actor.statut].some(value => String(value ?? "").toLocaleLowerCase("fr").includes(search)))
    return NextResponse.json({ coachs: actors })
  } catch {
    return NextResponse.json({ coachs: [], error: "Impossible de charger les coachs et leurs licences. Réessayez." }, { status: 503 })
  }
}
async function POSTHandler(request:Request){return handleActorWrite(request,"coachs","create")}

export const GET = protectedRoute(GETHandler)
export const POST = protectedRoute(POSTHandler)
