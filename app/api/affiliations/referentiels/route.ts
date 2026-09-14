import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-session"
import { readSheetRowsBatch } from "@/lib/google-sheets"

const options = (rows: Record<string, string>[], idKey: string, labelKey: string) => rows.map((row) => ({ id: row[idKey], label: row[labelKey] })).filter((item) => item.id)
export async function GET() {
  if (!await getSessionUser()) return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
  try {
    const [structure, refs] = await Promise.all([
      readSheetRowsBatch({ block: "structure", sheets: ["CLUBS", "EQUIPES", "LIGUES", "ENTENTES"] }),
      readSheetRowsBatch({ block: "referentiel", sheets: ["FEDERATION", "STATUTS_AFFILIATION", "FONCTIONS", "TYPES_STRUCTURES"] }),
    ])
    const { CLUBS: clubs, EQUIPES: teams, LIGUES: ligues, ENTENTES: ententes } = structure
    const { FEDERATION: federation, STATUTS_AFFILIATION: statuses, FONCTIONS: functions, TYPES_STRUCTURES: types } = refs
    const allFunctions = options(functions, "id_fonction", "nom_fonction")
    return NextResponse.json({
      clubs: options(clubs, "id_club", "nom_club"), teams: options(teams, "id_equipe", "nom_equipe"), statuses: options(statuses, "id_statut_affiliation", "nom_statut_affiliation"),
      functions: allFunctions, coachFunctions: allFunctions.filter((item) => ["FON005", "FON006", "FON099"].includes(item.id)),
      entityTypes: options(types, "id_type_structure", "nom_type_structure").filter((item) => ["STR000", "STR001", "STR002", "STR003", "STR099"].includes(item.id)),
      entities: { STR000: options(federation, "id_federation", "nom_officiel"), STR001: options(ligues, "id_ligue", "nom_ligue"), STR002: options(ententes, "id_entente", "nom_entente"), STR003: options(clubs, "id_club", "nom_club"), STR099: [] },
    })
  } catch { return NextResponse.json({ error: "Référentiels indisponibles." }, { status: 503 }) }
}
