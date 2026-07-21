import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-session"
import { fallbackId, pick, readCompetitionRows, rowKey } from "../competitions/_helpers"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 })

    const rows = await readCompetitionRows("competitions_unites")
    const unites = rows.map((row, index) => {
      const id = pick(row, ["id_unite", "id", "code_unite"])
      return {
        __key: rowKey(id, index),
        id: id === "-" ? fallbackId(index) : id,
        competitionId: pick(row, ["id_competition", "competition_id"]),
        competitionNom: pick(row, ["nom_competition", "competition"]),
        equipeId: pick(row, ["id_equipe", "equipe_id"]),
        equipeNom: pick(row, ["nom_equipe", "equipe", "équipe"]),
        clubId: pick(row, ["id_club", "club_id"]),
        clubNom: pick(row, ["nom_club", "club"]),
        categorie: pick(row, ["categorie", "catégorie", "category"]),
        genre: pick(row, ["genre", "sexe", "version"]),
        poule: pick(row, ["poule", "groupe"]),
        statut: pick(row, ["statut_unite", "statut", "status", "etat"]),
      }
    })

    return NextResponse.json({ unites })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ unites: [], error: message }, { status: 500 })
  }
}

