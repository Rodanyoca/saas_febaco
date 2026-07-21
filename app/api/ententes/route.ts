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
    const rows = await readSheetRows({ block: "structure", sheet: "ententes", range: "A:ZZ" })

    const filteredRows =
      scope.role === "federal"
        ? rows
        : rows.filter((row) => {
            if (scope.role === "ligue") {
              const ligueId = pickFirst(row, ["id_ligue", "ligue_id", "idligue"])
              return String(ligueId ?? "") === scope.ligueId
            }
            const ententeId = pickFirst(row, ["id_entente", "id", "code_entente", "code"])
            return String(ententeId ?? "") === scope.ententeId
          })

    const ententes = filteredRows.map((row, index) => {
      const id = pickFirst(row, ["id_entente"])
      const nom = pickFirst(row, ["nom_entente"])
      const pseudo = pickFirst(row, ["pseudo_entente"])
      const ligue = pickFirst(row, ["pseudo_ligue", "nom_ligue"])
      const email = pickFirst(row, ["email_entente"])
      const statut = pickFirst(row, ["statut"])

      const fallbackId = `row_${index + 2}`
      const __key = `${id || fallbackId}__${index + 2}`

      return {
        __key,
        id: id || fallbackId,
        nom: nom || "-",
        pseudo: pseudo || "-",
        ligue: ligue || "-",
        email: email || "-",
        statut: statut || "-",
      }
    })

    return NextResponse.json({ ententes })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ ententes: [], error: message }, { status: 500 })
  }
}
