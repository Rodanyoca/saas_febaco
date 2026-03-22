import { NextResponse } from "next/server"
import { pickFirst, readSheetRows } from "@/lib/google-sheets"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const rows = await readSheetRows("equipes")

    const equipes = rows.map((row, index) => {
      const id = pickFirst(row, ["id_equipe", "id", "code_equipe", "code"])
      const nom = pickFirst(row, ["nom_equipe", "nom", "equipe", "designation"])
      const club = pickFirst(row, ["nom_club", "club", "club_nom"])
      const entente = pickFirst(row, ["nom_entente", "entente", "entente_nom"])
      const ligue = pickFirst(row, ["nom_ligue", "ligue", "ligue_nom"])
      const province = pickFirst(row, ["nom_province", "province", "province_nom"])
      const categorie = pickFirst(row, ["categorie", "category"])
      const genre = pickFirst(row, ["genre", "version", "sexe"])
      const coach = pickFirst(row, ["nom_coach", "coach", "coach_nom"])
      const statut = pickFirst(row, ["statut", "status", "etat"])

      const fallbackId = `row_${index + 2}`
      const __key = `${id || fallbackId}__${index + 2}`

      return {
        __key,
        id: id || fallbackId,
        nom: nom || "-",
        club: club || "-",
        entente: entente || "-",
        ligue: ligue || "-",
        province: province || "-",
        categorie: categorie || "-",
        genre: genre || "-",
        coach: coach || "-",
        statut: statut || "-",
      }
    })

    return NextResponse.json({ equipes })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ equipes: [], error: message }, { status: 500 })
  }
}
