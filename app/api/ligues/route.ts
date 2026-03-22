import { NextResponse } from "next/server"
import { pickFirst, readSheetRows } from "@/lib/google-sheets"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const rows = await readSheetRows("ligues")

    const ligues = rows.map((row, index) => {
      const id = pickFirst(row, ["id_ligue", "id", "code_ligue", "code"])
      const nom = pickFirst(row, ["nom_ligue", "nom", "ligue", "designation"])
      const pseudo = pickFirst(row, ["pseudo_ligue", "pseudo", "sigle", "abreviation", "abbreviation"])
      const province = pickFirst(row, ["nom_province", "province", "province_nom"])
      const statut = pickFirst(row, ["statut", "status", "etat"])

      const fallbackId = `row_${index + 2}`
      const __key = `${id || fallbackId}__${index + 2}`

      return {
        __key,
        id: id || fallbackId,
        nom: nom || "-",
        pseudo: pseudo || "-",
        province: province || "-",
        statut: statut || "-",
      }
    })

    return NextResponse.json({ ligues })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ ligues: [], error: message }, { status: 500 })
  }
}
