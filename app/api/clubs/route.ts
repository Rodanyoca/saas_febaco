import { NextResponse } from "next/server"
import { pickFirst, readSheetRows } from "@/lib/google-sheets"
import { getSessionUser } from "@/lib/auth-session"
import { scopeFromSession } from "@/lib/auth-scope"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Non authentifie." }, { status: 401 })
    }

    const scope = scopeFromSession(user)
    const rows = await readSheetRows({ block: "structure", sheet: "clubs", range: "A:ZZ" })

    const filteredRows =
      scope.role === "federal"
        ? rows
        : rows.filter((row) => {
            if (scope.role === "ligue") {
              const ligueId = pickFirst(row, ["id_ligue"])
              return String(ligueId ?? "") === scope.ligueId
            }
            const ententeId = pickFirst(row, ["id_entente"])
            return String(ententeId ?? "") === scope.ententeId
          })

    const clubs = filteredRows.map((row, index) => {
      const id = pickFirst(row, ["id_club"])
      const nom = pickFirst(row, ["nom_club"])
      const categorie = pickFirst(row, ["categorie"])
      const version = pickFirst(row, ["version"])
      const dateAffiliation = pickFirst(row, ["date_affiliation_club"])
      const ententeId = pickFirst(row, ["id_entente"])
      const entente = pickFirst(row, ["pseudo_entente", "nom_entente"])
      const ligueId = pickFirst(row, ["id_ligue"])
      const ligue = pickFirst(row, ["pseudo_ligue", "nom_ligue"])
      const statut = pickFirst(row, ["statut"])
      const observation = pickFirst(row, ["observations"])

      const fallbackId = `row_${index + 2}`
      const __key = `${id || fallbackId}__${index + 2}`

      return {
        __key,
        id: id || fallbackId,
        ligueId: ligueId || "",
        ententeId: ententeId || "",
        ligueKey: ligueId || ligue || "",
        ententeKey: ententeId || entente || "",
        nom: nom || "-",
        categorie: categorie || "-",
        version: version || "-",
        dateAffiliation: dateAffiliation || "-",
        entente: entente || "-",
        ligue: ligue || "-",
        observation: observation || "",
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
