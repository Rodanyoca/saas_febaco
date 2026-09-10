import { NextResponse } from "next/server"
import { pickFirst, readSheetRows } from "@/lib/google-sheets"
import { getSessionUser } from "@/lib/auth-session"
import { scopeFromSession } from "@/lib/auth-scope"
import { handleTerritorialWrite } from "@/app/api/_territorial-write"
import { getReferenceMap } from "@/lib/territorial"

export const dynamic = "force-dynamic"

export async function POST(request: Request) { return handleTerritorialWrite(request, "clubs", "create") }

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Non authentifie." }, { status: 401 })
    }

    const scope = scopeFromSession(user)
    const [rows,ententeRows,ligueRows,categories] = await Promise.all([readSheetRows({ block: "structure", sheet: "clubs", range: "A:ZZ" }),readSheetRows({block:"structure",sheet:"ENTENTES",range:"A:M"}),readSheetRows({block:"structure",sheet:"LIGUES",range:"A:K"}),getReferenceMap("CATEGORIES_CLUB")])
    const ententes=new Map(ententeRows.map(row=>[row.id_entente,row])), ligues=new Map(ligueRows.map(row=>[row.id_ligue,row]))

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
      const categorie = pickFirst(row, ["id_categorie_club", "categorie", "id_categorie"])
      const version = pickFirst(row, ["version"])
      const dateAffiliation = pickFirst(row, ["date_affiliation", "date_affiliation_club"])
      const ententeId = pickFirst(row, ["id_entente"])
      const ententeRow=ententes.get(ententeId)
      const entente = pickFirst(row, ["sigle_entente", "pseudo_entente"]) || pickFirst(ententeRow || {}, ["sigle_entente", "pseudo_entente"]) || ententeId
      const ligueId = ententeRow?.id_ligue || ""
      const ligueRow = ligues.get(ligueId)
      const ligue = pickFirst(row, ["sigle_ligue", "pseudo_ligue"]) || pickFirst(ligueRow || {}, ["sigle_ligue", "pseudo_ligue"]) || ligueId
      const statut = pickFirst(row, ["statut"])
      const observation = pickFirst(row, ["observations"])

      const fallbackId = `row_${index + 2}`
      const __key = `${id || fallbackId}__${index + 2}`

      return {
        ...row,
        __key,
        id: id || fallbackId,
        ligueId: ligueId || "",
        ententeId: ententeId || "",
        ligueKey: ligueId || ligue || "",
        ententeKey: ententeId || entente || "",
        nom: nom || "-",
        sigle: pickFirst(row, ["sigle_club"]) || "-",
        categorie: categories.get(categorie) || categorie || "-",
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
