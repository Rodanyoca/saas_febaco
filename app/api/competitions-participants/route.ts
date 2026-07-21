import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-session"
import { buildAthleteAvatarMap, resolveActorAvatar } from "@/lib/avatar-resolver"
import { readSheetRows } from "@/lib/google-sheets"
import { fallbackId, pick, readCompetitionRows, rowKey } from "../competitions/_helpers"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 })

    const rows = await readCompetitionRows("competitions_participants")
    const athleteAvatarMap = buildAthleteAvatarMap(await readSheetRows("athletes"))
    const participants = rows.map((row, index) => {
      const id = pick(row, ["id_participation", "id", "code_participation"])
      const athleteId = pick(row, ["id_athlete", "athlete_id", "id_joueur"])
      const avatar = resolveActorAvatar(row, athleteId, athleteAvatarMap)
      return {
        __key: rowKey(id, index),
        id: id === "-" ? fallbackId(index) : id,
        competitionId: pick(row, ["id_competition", "competition_id"]),
        competitionNom: pick(row, ["nom_competition", "competition"]),
        athleteId,
        athleteNom: avatar.displayName || pick(row, ["nom_athlete", "nom_joueur", "athlete", "nom_complet"]),
        avatarUrl: avatar.avatarUrl,
        equipeId: pick(row, ["id_equipe", "equipe_id"]),
        equipeNom: pick(row, ["nom_equipe", "equipe", "équipe"]),
        clubId: pick(row, ["id_club", "club_id"]),
        clubNom: pick(row, ["nom_club", "club"]),
        categorie: pick(row, ["categorie", "catégorie", "category"]),
        genre: pick(row, ["genre", "sexe", "version"]),
        statut: pick(row, ["statut_participation", "statut", "status", "etat"]),
      }
    })

    return NextResponse.json({ participants })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ participants: [], error: message }, { status: 500 })
  }
}
