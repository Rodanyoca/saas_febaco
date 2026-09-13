import { NextResponse } from "next/server"
import { pickFirst, readSheetRows } from "@/lib/google-sheets"
import { getSessionUser } from "@/lib/auth-session"
import { handleTerritorialWrite } from "@/app/api/_territorial-write"
import { getReferenceMap } from "@/lib/territorial"
import { scopeFromSession } from "@/lib/auth-scope"

export const dynamic = "force-dynamic"

export async function POST(request: Request) { return handleTerritorialWrite(request, "equipes", "create") }

function normalize(value: unknown): string {
  return String(value ?? "").trim().toLowerCase()
}

async function optionalReferenceMap(sheet: string) {
  try { return await getReferenceMap(sheet) }
  catch (error) {
    console.warn(`[api/equipes] Référentiel facultatif indisponible: ${sheet}`, error)
    return new Map<string, string>()
  }
}

export async function GET(req: Request) {
  try {
    const user=await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
    }
    const scope=scopeFromSession(user)
    const { searchParams } = new URL(req.url)
    const fresh = searchParams.get("fresh") === "1"
    const filterLigueId = normalize(searchParams.get("ligueId"))
    const filterLigueName = normalize(searchParams.get("ligue"))
    const filterClubId = normalize(searchParams.get("clubId"))
    const filterClubName = normalize(searchParams.get("club"))
    const [rows,clubRows,ententeRows,ligueRows,categories,sexes] = await Promise.all([readSheetRows({block:"structure",sheet:"EQUIPES",range:"A:ZZ",fresh}),readSheetRows({block:"structure",sheet:"CLUBS",range:"A:P"}),readSheetRows({block:"structure",sheet:"ENTENTES",range:"A:M"}),readSheetRows({block:"structure",sheet:"LIGUES",range:"A:K"}),optionalReferenceMap("CATEGORIES_AGE"),optionalReferenceMap("SEXES")])
    const clubs=new Map(clubRows.map(row=>[row.id_club,row])),ententes=new Map(ententeRows.map(row=>[row.id_entente,row])),ligues=new Map(ligueRows.map(row=>[row.id_ligue,row.nom_ligue]))

    const filteredRows = rows.filter((row) => {
      const clubId = normalize(pickFirst(row, ["id_club", "club_id", "idclub"]))
      const clubRow=clubs.get(pickFirst(row,["id_club"])),ententeId=clubRow?.id_entente||"",ententeRow=ententes.get(ententeId),ligueId=normalize(ententeRow?.id_ligue),ligue=normalize(ligues.get(ententeRow?.id_ligue||"")),club=normalize(clubRow?.nom_club)
      if(scope.role==="ligue"&&ligueId!==normalize(scope.ligueId))return false
      if(scope.role==="entente"&&normalize(ententeId)!==normalize(scope.ententeId))return false
      const hasLigueFilter = Boolean(filterLigueId || filterLigueName)
      const hasClubFilter = Boolean(filterClubId || filterClubName)

      if (!hasLigueFilter && !hasClubFilter) return true

      const ligueMatches =
        !hasLigueFilter ||
        (filterLigueId && ligueId === filterLigueId) ||
        (filterLigueName && ligue === filterLigueName)
      const clubMatches =
        !hasClubFilter ||
        (filterClubId && clubId === filterClubId) ||
        (filterClubName && club === filterClubName)

      return Boolean(ligueMatches && clubMatches)
    })

    const equipes = filteredRows.map((row, index) => {
      const id = pickFirst(row, ["id_equipe", "id", "code_equipe", "code"])
      const ligueId = pickFirst(row, ["id_ligue", "ligue_id", "idligue"])
      const ententeId = pickFirst(row, ["id_entente", "entente_id", "identente"])
      const clubId = pickFirst(row, ["id_club", "club_id", "idclub"])
      const nom = pickFirst(row, ["nom_equipe", "nom", "equipe", "designation"])
      const clubRow=clubs.get(clubId),ententeRow=ententes.get(clubRow?.id_entente||""),ligueIdResolved=ententeRow?.id_ligue||""
      const club = pickFirst(row, ["nom_club", "club", "club_nom"]) || clubRow?.nom_club || clubId
      const entente = pickFirst(row, ["nom_entente", "entente", "entente_nom"]) || ententeRow?.nom_entente || clubRow?.id_entente || ""
      const ligue = pickFirst(row, ["nom_ligue", "ligue", "ligue_nom"]) || ligues.get(ligueIdResolved) || ligueIdResolved
      const province = pickFirst(row, ["nom_province", "province", "province_nom"])
      const categorieId=pickFirst(row,["id_categorie_age"]),sexeId=pickFirst(row,["id_sexe"])
      const categorie = pickFirst(row, ["categorie", "category"]) || categories.get(categorieId) || categorieId
      const genre = pickFirst(row, ["genre", "version", "sexe"]) || sexes.get(sexeId) || sexeId
      const coach = pickFirst(row, ["nom_coach", "coach", "coach_nom"])
      const saison = pickFirst(row, ["saison", "season", "annee_sportive", "année_sportive"])
      const statut = pickFirst(row, ["statut", "status", "etat"])

      const fallbackId = `row_${index + 2}`
      const __key = `${id || fallbackId}__${index + 2}`

      return {
        ...row,
        __key,
        id: id || fallbackId,
        ligueId: ligueId || "",
        ententeId: ententeId || "",
        clubId: clubId || "",
        nom: nom || "-",
        club: club || "-",
        entente: entente || "-",
        ligue: ligue || "-",
        province: province || "-",
        categorie: categorie || "-",
        genre: genre || "-",
        coach: coach || "-",
        saison: saison || "-",
        statut: statut || "-",
      }
    })

    return NextResponse.json({ equipes })
  } catch (error) {
    console.error("[api/equipes] Lecture impossible", error)
    return NextResponse.json({ equipes: [], error: "Lecture impossible." }, { status: 500 })
  }
}
