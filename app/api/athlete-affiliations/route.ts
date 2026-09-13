import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-session"
import { listAthleteAffiliations } from "@/lib/affiliations"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  if (!await getSessionUser()) return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
  try {
    const params = new URL(request.url).searchParams
    let affiliations = await listAthleteAffiliations({
      actorId: params.get("athleteId")?.trim(),
      equipeId: params.get("equipeId")?.trim(),
      clubId: params.get("clubId")?.trim(),
    })
    const equipeIds = new Set(
      (params.get("equipeIds") ?? "")
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    )
    if (equipeIds.size) {
      affiliations = affiliations.filter((item) =>
        equipeIds.has(String(item.equipeId ?? item.id_equipe ?? "").trim().toLowerCase()),
      )
    }
    const search = params.get("search")?.trim().toLocaleLowerCase("fr")
    const status = params.get("statut")?.trim()
    const sex = params.get("sexe")?.trim()
    if (search) affiliations = affiliations.filter((item) => [item.athlete, item.equipe, item.club].join(" ").toLocaleLowerCase("fr").includes(search))
    if (status) affiliations = affiliations.filter((item) => item.id_statut_affiliation === status || item.statut === status)
    if (sex) {
      const normalizedSex = sex.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()
      affiliations = affiliations.filter((item) => {
        const values = item.id_sexe === "SEX001" ? ["sex001", "m", "masculin"] : item.id_sexe === "SEX002" ? ["sex002", "f", "feminin"] : ["sex099", "autre"]
        return values.includes(normalizedSex)
      })
    }
    const page = Math.max(1, Number(params.get("page")) || 1)
    const pageSize = Math.min(100, Math.max(1, Number(params.get("pageSize")) || 25))
    const total = affiliations.length
    const pageItems = affiliations.slice((page - 1) * pageSize, page * pageSize)
    const athletes = pageItems.map((item) => ({ ...item, __key: item.id, id: item.id_athlete, nom: item.athlete, prenom: "", equipeId: item.equipeId, equipe: item.equipe, clubId: item.clubId, club: item.club, statut: item.statut }))
    return NextResponse.json({ affiliations: pageItems, athletes, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } })
  } catch (error) {
    return NextResponse.json({ affiliations: [], error: error instanceof Error ? error.message : "Lecture impossible." }, { status: 503 })
  }
}
