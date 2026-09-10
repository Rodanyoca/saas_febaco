import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-session"
import { readSheetRows } from "@/lib/google-sheets"

const options = (rows: Record<string, string>[], idKey: string, labelKey: string) => rows.map((row) => ({ id: row[idKey], label: row[labelKey] })).filter((item) => item.id)
export async function GET() {
  if (!await getSessionUser()) return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
  try {
    const [clubs, teams, ligues, ententes, federation, statuses, functions, types] = await Promise.all([
      readSheetRows({ block: "structure", sheet: "CLUBS", range: "A:ZZ" }), readSheetRows({ block: "structure", sheet: "EQUIPES", range: "A:ZZ" }),
      readSheetRows({ block: "structure", sheet: "LIGUES", range: "A:ZZ" }), readSheetRows({ block: "structure", sheet: "ENTENTES", range: "A:ZZ" }),
      readSheetRows({ block: "referentiel", sheet: "FEDERATION", range: "A:F" }), readSheetRows({ block: "referentiel", sheet: "STATUTS_AFFILIATION", range: "A:F" }),
      readSheetRows({ block: "referentiel", sheet: "FONCTIONS", range: "A:F" }), readSheetRows({ block: "referentiel", sheet: "TYPES_STRUCTURES", range: "A:F" }),
    ])
    const allFunctions = options(functions, "id_fonction", "nom_fonction")
    return NextResponse.json({
      clubs: options(clubs, "id_club", "nom_club"), teams: options(teams, "id_equipe", "nom_equipe"), statuses: options(statuses, "id_statut_affiliation", "nom_statut_affiliation"),
      functions: allFunctions, coachFunctions: allFunctions.filter((item) => ["FON005", "FON006", "FON099"].includes(item.id)),
      entityTypes: options(types, "id_type_structure", "nom_type_structure").filter((item) => ["STR000", "STR001", "STR002", "STR003", "STR099"].includes(item.id)),
      entities: { STR000: options(federation, "id_federation", "nom_officiel"), STR001: options(ligues, "id_ligue", "nom_ligue"), STR002: options(ententes, "id_entente", "nom_entente"), STR003: options(clubs, "id_club", "nom_club"), STR099: [] },
    })
  } catch { return NextResponse.json({ error: "Référentiels indisponibles." }, { status: 503 }) }
}
