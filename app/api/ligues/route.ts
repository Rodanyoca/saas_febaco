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
    const rows = await readSheetRows("ligues")

    let allowedLigueId: string | null = null
    if (scope.role === "ligue") {
      allowedLigueId = scope.ligueId
    } else if (scope.role === "entente") {
      const ententes = await readSheetRows("ententes")
      const ententeRow = ententes.find((r) => {
        const id = pickFirst(r, ["id_entente", "id", "code_entente", "code"])
        return String(id ?? "") === scope.ententeId
      })

      const ligueId = ententeRow ? pickFirst(ententeRow, ["id_ligue", "ligue_id", "idligue"]) : null
      allowedLigueId = ligueId ? String(ligueId) : null
    }

    const filteredRows =
      scope.role === "federal" ? rows : rows.filter((row) => {
        if (!allowedLigueId) return false
        const id = pickFirst(row, ["id_ligue", "id", "code_ligue", "code"])
        return String(id ?? "") === allowedLigueId
      })

    const ligues = filteredRows.map((row, index) => {
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
