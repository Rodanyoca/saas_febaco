import { protectedRoute } from "@/lib/auth/guard"
import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-session"
import { listActors } from "@/lib/actors"
import { handleActorWrite } from "@/app/api/_actor-write"
import { readSheetRows } from "@/lib/google-sheets"
import { resolveAthleteAgeCategory } from "@/lib/athlete-age-category"
import { loadSeasonSettings } from "@/lib/current-season"
import { compareLicenceNumbers, currentSeasonLicenceIndex, missingSeasonLicence } from "@/lib/current-season-domain"
export const dynamic="force-dynamic"
async function GETHandler(request: Request) {
  if (!await getSessionUser()) return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
  try {
    const params = new URL(request.url).searchParams, id = params.get("id")?.trim().toLowerCase(), search = params.get("search")?.trim().toLocaleLowerCase("fr")
    const [actorRows, categories, settings] = await Promise.all([
      listActors("athletes"),
      readSheetRows({ block: "referentiel", sheet: "CATEGORIES_AGE", range: "A:F" }),
      id ? Promise.resolve(null) : loadSeasonSettings(),
    ])
    // Une seule lecture des licences pour la liste ; aucun appel par athlète.
    const licences = settings?.currentSeasonId ? await readSheetRows({ block: "licences", sheet: "ATHLETE_LICENCES", range: "A:ZZ" }) : []
    const licenceByAthlete = currentSeasonLicenceIndex(licences, settings?.currentSeasonId || "")
    let actors: Array<Record<string, string>> = (actorRows as unknown as Array<Record<string, string>>).map(actor => ({
      ...actor, categorie: resolveAthleteAgeCategory(actor.dateNaissance || actor.date_de_naissance, categories).label,
      ...(!id ? licenceByAthlete.get(actor.id) || missingSeasonLicence : {}),
    }))
    if (id) actors = actors.filter(actor => actor.id.toLowerCase() === id)
    if (search) actors = actors.filter(actor => [actor.licenceDisplay, actor.nomComplet, actor.sexe, actor.dateNaissance, actor.idNational, actor.idFiba, actor.statut].some(value => String(value ?? "").toLocaleLowerCase("fr").includes(search)))
    if (params.get("sort") === "licence") actors.sort((a, b) => compareLicenceNumbers({ ...a, id: a.id }, { ...b, id: b.id }, params.get("direction") === "desc" ? "desc" : "asc"))
    return NextResponse.json({ athletes: actors, ...(!id ? { currentSeason: settings?.currentSeason || null } : {}) })
  } catch {
    return NextResponse.json({ athletes: [], error: "Impossible de charger les athlètes et leur saison courante. Vérifiez la configuration des paramètres ou réessayez." }, { status: 503 })
  }
}
async function POSTHandler(request:Request){return handleActorWrite(request,"athletes","create")}

export const GET = protectedRoute(GETHandler)
export const POST = protectedRoute(POSTHandler)
