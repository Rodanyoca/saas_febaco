import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-session"
import { readSheetRows } from "@/lib/google-sheets"

const sheets = ["PROVINCES","VILLES","CATEGORIES_CLUB","NIVEAUX_COMPETITIFS_CLUB","DISCIPLINES","CATEGORIES_AGE","SEXES"] as const

export async function GET() {
  if (!(await getSessionUser())) return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
  try {
    const entries = await Promise.all(sheets.map(async (sheet) => {
      const rows = await readSheetRows({ block: "referentiel", sheet, range: "A:F" })
      return [sheet, rows.map((row) => {
        const idKey = Object.keys(row).find((key) => key.startsWith("id_")) ?? "id"
        const labelKey = Object.keys(row).find((key) => key.startsWith("nom_")) ?? "nom"
        return { id: row[idKey], label: row[labelKey] || row[idKey] }
      }).filter((item) => item.id)]
    }))
    return NextResponse.json({ referentiels: Object.fromEntries(entries) })
  } catch { return NextResponse.json({ error: "Référentiels temporairement indisponibles." }, { status: 503 }) }
}
