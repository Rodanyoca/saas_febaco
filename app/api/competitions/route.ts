import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-session"
import { matchesId, pick, rawPick, readCompetitionRows, rowKey } from "./_helpers"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 })

    const filterCompetitionId = new URL(req.url).searchParams.get("competitionId")?.trim() ?? ""
    const rows = await readCompetitionRows("competitions")
    const validRows = rows.filter((row) => {
      const id = rawPick(row, ["id_competition", "id", "code_competition", "code"])
      return Boolean(id) && matchesId(id, filterCompetitionId)
    })
    const competitions = validRows.map((row, index) => {
      const id = rawPick(row, ["id_competition", "id", "code_competition", "code"])
      return {
        __key: rowKey(id, index),
        id,
        nom: pick(row, ["nom_competition", "competition", "nom", "designation"]),
        typeCompetition: pick(row, ["type_competition"]),
        disciplineId: pick(row, ["id_discipline"]),
        discipline: pick(row, ["discipline"]),
        saison: pick(row, ["saison", "season", "annee_sportive"]),
        categorie: pick(row, ["categorie", "catégorie", "category"]),
        genre: pick(row, ["genre", "sexe", "version"]),
        niveau: pick(row, ["niveau", "level"]),
        dateDebut: pick(row, ["date_debut", "date_début", "debut"]),
        dateFin: pick(row, ["date_fin", "fin"]),
        lieu: pick(row, ["lieu", "site", "ville"]),
        structureOrganisatriceId: pick(row, ["id_structure_organisatrice"]),
        structureOrganisatriceNom: pick(row, ["nom_structure_organisatrice"]),
        statut: pick(row, ["statut", "statut_competition", "status", "etat"]),
        observation: pick(row, ["observation"]),
      }
    })

    return NextResponse.json({ competitions })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ competitions: [], error: message }, { status: 500 })
  }
}
