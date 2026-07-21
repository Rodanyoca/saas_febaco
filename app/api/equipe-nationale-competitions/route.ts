import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-session"
import { fallbackId, pick, readCompetitionRows, rowKey } from "../competitions/_helpers"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 })

    const rows = await readCompetitionRows("equipe_nationale_competitions")
    const competitions = rows.map((row, index) => {
      const id = pick(row, ["id_participation_en", "id", "code_participation_en"])
      return {
        __key: rowKey(id, index),
        id: id === "-" ? fallbackId(index) : id,
        equipeNationaleId: pick(row, ["id_equipe_nationale", "equipe_nationale_id"]),
        equipeNationaleNom: pick(row, ["nom_equipe_nationale", "equipe_nationale"]),
        competitionId: pick(row, ["id_competition", "competition_id"]),
        competitionNom: pick(row, ["nom_competition", "competition"]),
        niveauCompetition: pick(row, ["niveau_competition", "niveau", "level"]),
        dateDebut: pick(row, ["date_debut", "debut"]),
        dateFin: pick(row, ["date_fin", "fin"]),
        lieu: pick(row, ["lieu", "site", "ville"]),
        statutParticipation: pick(row, ["statut_participation", "statut", "status", "etat"]),
        observation: pick(row, ["observation", "observations", "note", "commentaire"]),
      }
    })

    return NextResponse.json({ competitions })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ competitions: [], error: message }, { status: 500 })
  }
}
