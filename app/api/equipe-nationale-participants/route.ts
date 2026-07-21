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

    const rows = await readCompetitionRows("equipe_nationale_participants")
    const athleteAvatarMap = buildAthleteAvatarMap(await readSheetRows("athletes"))
    const participants = rows.map((row, index) => {
      const id = pick(row, ["id_participant_en", "id", "code_participant_en"])
      const athleteId = pick(row, ["id_athlete", "athlete_id"])
      const avatar = resolveActorAvatar(row, athleteId, athleteAvatarMap)
      return {
        __key: rowKey(id, index),
        id: id === "-" ? fallbackId(index) : id,
        participationId: pick(row, ["id_participation_en", "participation_en_id"]),
        equipeNationaleId: pick(row, ["id_equipe_nationale", "equipe_nationale_id"]),
        equipeNationaleNom: pick(row, ["nom_equipe_nationale", "equipe_nationale"]),
        selectionId: pick(row, ["id_selection", "selection_id"]),
        athleteId,
        athleteNom: avatar.displayName || pick(row, ["nom_athlete", "athlete", "nom_complet"]),
        avatarUrl: avatar.avatarUrl,
        equipeId: pick(row, ["id_equipe", "equipe_id"]),
        equipeNom: pick(row, ["nom_equipe", "equipe"]),
        clubId: pick(row, ["id_club", "club_id"]),
        clubNom: pick(row, ["nom_club", "club"]),
        poste: pick(row, ["poste", "position"]),
        statutParticipant: pick(row, ["statut_participant", "statut", "status", "etat"]),
        observation: pick(row, ["observation", "observations", "note", "commentaire"]),
      }
    })

    return NextResponse.json({ participants })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ participants: [], error: message }, { status: 500 })
  }
}
