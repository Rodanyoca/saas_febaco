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
    const [rows, licences, statuses, specialties] = await Promise.all([
      listActors("medecins"),
      id ? Promise.resolve([]) : readSheetRows({ block: "licences", sheet: "ACTEURS_LICENCES", range: "A:J" }),
      id ? Promise.resolve([]) : readSheetRows({ block: "referentiel", sheet: "STATUT_LICENCE", range: "A:D" }),
      readSheetRows({ block: "referentiel", sheet: "SPECIALITES_MEDECINS", range: "A:ZZ" }),
    ])
    const index = actorLicenceIndex(licences, statuses, "TAC005")
    const specialtyById = new Map(specialties.map(row => [String(row.id_specialite_sante || row.id_specialite || "").trim(), String(row.nom_specialite_sante || row.nom_specialite || "").trim()]))
    let actors: Array<Record<string, string | boolean>> = rows.filter(actor => !id || actor.id.toLowerCase() === id).map(actor => {
      const specialtyId = String(actor.id_specialite_sante || "").trim(), legacySpecialty = String(actor.specialite || "").trim()
      const specialtyLabel = specialtyById.get(specialtyId || legacySpecialty) || (specialtyId ? "Spécialité non référencée" : legacySpecialty)
      return { ...actor, specialite: specialtyLabel, ...(!id ? index.get(actor.id) || { licenceNumero: "", licenceDisplay: "", licenceAmbiguous: false } : {}) }
    })
    if (search) actors = actors.filter(actor => Object.values(actor).filter(value => typeof value === "string").join(" ").toLowerCase().includes(search))
    return NextResponse.json({ medecins: actors })
  } catch (error) {
    return NextResponse.json({ medecins: [], error: error instanceof Error ? error.message : "Lecture impossible." }, { status: 500 })
  }
}
async function POSTHandler(request:Request){return handleActorWrite(request,"medecins","create")}

export const GET = protectedRoute(GETHandler)
export const POST = protectedRoute(POSTHandler)
