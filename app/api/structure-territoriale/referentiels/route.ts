import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-session"
import { readSheetRowsBatch } from "@/lib/google-sheets"

const sheets = ["PROVINCES","VILLES","CATEGORIES_CLUB","NIVEAUX_COMPETITIFS_CLUB","CATEGORIES_AGE","SEXES"] as const
const columns: Record<(typeof sheets)[number], { id: string; label: string }> = {
  PROVINCES: { id: "id_province", label: "nom_province" },
  VILLES: { id: "id_ville", label: "nom_ville" },
  CATEGORIES_CLUB: { id: "id_categorie_club", label: "nom_categorie_club" },
  NIVEAUX_COMPETITIFS_CLUB: { id: "id_niveau_competitif_club", label: "nom_niveau_competitif_club" },
  CATEGORIES_AGE: { id: "id_categorie_age", label: "nom_categorie_age" },
  SEXES: { id: "id_sexe", label: "nom_sexe" },
}

export async function GET() {
  if (!(await getSessionUser())) return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
  try {
    const loaded = await readSheetRowsBatch({ block: "referentiel", sheets })
    const entries = sheets.map((sheet) => {
      const rows = loaded[sheet] || []
      const expected = columns[sheet]
      const seen = new Set<string>()
      return [sheet, rows.flatMap((row) => {
        const id = String(row[expected.id] ?? "").trim()
        if (!id || seen.has(id)) return []
        seen.add(id)
        return [{ id, label: String(row[expected.label] ?? "").trim() || id }]
      })]
    })
    return NextResponse.json({ referentiels: Object.fromEntries(entries) })
  } catch { return NextResponse.json({ error: "Référentiels temporairement indisponibles." }, { status: 503 }) }
}
