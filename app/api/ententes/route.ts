import { NextResponse } from "next/server"
import { pickFirst, readSheetRows } from "@/lib/google-sheets"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const rows = await readSheetRows("ententes")

    const ententes = rows.map((row, index) => {
      const id = pickFirst(row, ["id_entente", "id", "code_entente", "code"])
      const nom = pickFirst(row, ["nom_entente", "nom", "entente", "designation"])
      const pseudo = pickFirst(row, ["pseudo_entente", "pseudo", "sigle", "abreviation", "abbreviation"])
      const ligueId = pickFirst(row, ["id_ligue", "ligue_id", "idligue"])
      const ligue = pickFirst(row, ["nom_ligue", "ligue", "ligue_nom"])
      const province = pickFirst(row, ["nom_province", "province", "province_nom"])
      const statut = pickFirst(row, ["statut", "status", "etat"])

      const fallbackId = `row_${index + 2}`
      const __key = `${id || fallbackId}__${index + 2}`

      return {
        __key,
        id: id || fallbackId,
        nom: nom || "-",
        pseudo: pseudo || "-",
        ligueId: ligueId || "-",
        ligue: ligue || "-",
        province: province || "-",
        statut: statut || "-",
      }
    })

    return NextResponse.json({ ententes })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ ententes: [], error: message }, { status: 500 })
  }
}
