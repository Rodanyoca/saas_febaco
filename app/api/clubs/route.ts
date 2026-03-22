import { NextResponse } from "next/server"
import { pickFirst, readSheetRows } from "@/lib/google-sheets"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const rows = await readSheetRows("clubs")

    const clubs = rows.map((row, index) => {
      const id = pickFirst(row, ["id_club", "id", "code_club", "code"])
      const nom = pickFirst(row, ["nom_club", "nom", "club", "designation"])
      const categorie = pickFirst(row, ["categorie", "category"])
      const entente = pickFirst(row, ["nom_entente", "entente", "entente_nom"])
      const ligue = pickFirst(row, ["nom_ligue", "ligue", "ligue_nom"])
      const province = pickFirst(row, ["nom_province", "province", "province_nom"])
      const statut = pickFirst(row, ["statut", "status", "etat"])

      const fallbackId = `row_${index + 2}`
      const __key = `${id || fallbackId}__${index + 2}`

      return {
        __key,
        id: id || fallbackId,
        nom: nom || "-",
        categorie: categorie || "-",
        entente: entente || "-",
        ligue: ligue || "-",
        province: province || "-",
        statut: statut || "-",
        nombreEquipes: 0,
        nombreAthletes: 0,
      }
    })

    return NextResponse.json({ clubs })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ clubs: [], error: message }, { status: 500 })
  }
}
