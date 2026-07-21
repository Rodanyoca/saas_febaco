import { NextResponse } from "next/server"
import { pickFirst, readSheetRows } from "@/lib/google-sheets"

export const dynamic = "force-dynamic"

function normalize(value: unknown): string {
  return String(value ?? "").trim().toLowerCase()
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const filterLigueId = normalize(searchParams.get("ligueId"))
    const filterLigueName = normalize(searchParams.get("ligue"))
    const filterClubId = normalize(searchParams.get("clubId"))
    const filterClubName = normalize(searchParams.get("club"))
    const rows = await readSheetRows("equipes")

    const filteredRows = rows.filter((row) => {
      const ligueId = normalize(pickFirst(row, ["id_ligue", "ligue_id", "idligue"]))
      const ligue = normalize(pickFirst(row, ["nom_ligue", "ligue", "ligue_nom", "pseudo_ligue"]))
      const clubId = normalize(pickFirst(row, ["id_club", "club_id", "idclub"]))
      const club = normalize(pickFirst(row, ["nom_club", "club", "club_nom"]))
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
      const club = pickFirst(row, ["nom_club", "club", "club_nom"])
      const entente = pickFirst(row, ["nom_entente", "entente", "entente_nom"])
      const ligue = pickFirst(row, ["nom_ligue", "ligue", "ligue_nom"])
      const province = pickFirst(row, ["nom_province", "province", "province_nom"])
      const categorie = pickFirst(row, ["categorie", "category"])
      const genre = pickFirst(row, ["genre", "version", "sexe"])
      const coach = pickFirst(row, ["nom_coach", "coach", "coach_nom"])
      const saison = pickFirst(row, ["saison", "season", "annee_sportive", "année_sportive"])
      const statut = pickFirst(row, ["statut", "status", "etat"])

      const fallbackId = `row_${index + 2}`
      const __key = `${id || fallbackId}__${index + 2}`

      return {
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
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ equipes: [], error: message }, { status: 500 })
  }
}
