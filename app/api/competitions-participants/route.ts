import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-session"
import { matchesId, pick, rawPick, readCompetitionRows, rowKey } from "../competitions/_helpers"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 })

    const filterCompetitionId = new URL(req.url).searchParams.get("competitionId")?.trim() ?? ""
    const rows = await readCompetitionRows("competitions_participants")
    const validRows = rows.filter((row) => {
      const id = rawPick(row, ["id_participation", "id", "code_participation"])
      const competitionId = rawPick(row, ["id_competition", "competition_id"])
      return Boolean(id) && matchesId(competitionId, filterCompetitionId)
    })
    const participants = validRows.map((row, index) => {
      const id = rawPick(row, ["id_participation", "id", "code_participation"])
      const athleteId = pick(row, ["id_athlete", "athlete_id", "id_joueur"])
      return {
        __key: rowKey(id, index),
        id,
        competitionId: pick(row, ["id_competition", "competition_id"]),
        competitionNom: pick(row, ["nom_competition", "competition"]),
        saison: pick(row, ["saison"]),
        athleteId,
        athleteNom: pick(row, ["nom_athlete"]),
        sexe: pick(row, ["sexe"]),
        posteId: pick(row, ["id_poste"]),
        posteNom: pick(row, ["nom_poste"]),
        equipeId: pick(row, ["id_equipe", "equipe_id"]),
        equipeNom: pick(row, ["nom_equipe", "equipe", "équipe"]),
        clubId: pick(row, ["id_club", "club_id"]),
        clubNom: pick(row, ["nom_club", "club"]),
        categorie: pick(row, ["categorie", "catégorie", "category"]),
        genre: pick(row, ["genre", "sexe", "version"]),
        statut: pick(row, ["statut_participation", "statut", "status", "etat"]),
        observation: pick(row, ["observation"]),
      }
    })

    return NextResponse.json({ participants })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ participants: [], error: message }, { status: 500 })
  }
}
