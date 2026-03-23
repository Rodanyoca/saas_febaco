import { NextResponse } from "next/server"
import { pickFirst, readSheetRows } from "@/lib/google-sheets"
import { getSessionUser } from "@/lib/auth-session"
import { scopeFromSession } from "@/lib/auth-scope"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
    }

    const scope = scopeFromSession(user)
    const rows = await readSheetRows("clubs")

    const filteredRows =
      scope.role === "federal"
        ? rows
        : rows.filter((row) => {
            if (scope.role === "ligue") {
              const ligueId = pickFirst(row, ["id_ligue", "ligue_id", "idligue"])
              return String(ligueId ?? "") === scope.ligueId
            }
            const ententeId = pickFirst(row, ["id_entente", "entente_id", "identente"])
            return String(ententeId ?? "") === scope.ententeId
          })

    const clubs = filteredRows.map((row, index) => {
      const id = pickFirst(row, ["id_club", "id", "code_club", "code"])
      const nom = pickFirst(row, ["nom_club", "nom", "club", "designation"])
      const categorie = pickFirst(row, ["categorie", "category"])
      const entente = pickFirst(row, ["nom_entente", "entente", "entente_nom"])
      const ligue = pickFirst(row, ["nom_ligue", "ligue", "ligue_nom"])
      const province = pickFirst(row, ["nom_province", "province", "province_nom"])
      const dateAffiliation = pickFirst(row, [
        "date_affiliation",
        "date_d_affiliation",
        "date_aff",
        "affiliation",
      ])
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
        dateAffiliation: dateAffiliation || "-",
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
