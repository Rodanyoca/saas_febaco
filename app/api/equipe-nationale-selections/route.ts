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

    const rows = await readCompetitionRows("equipe_nationale_selections")
    const athleteAvatarMap = buildAthleteAvatarMap(await readSheetRows("athletes"))
    const selections = rows.map((row, index) => {
      const id = pick(row, ["id_selection", "id", "code_selection"])
      const athleteId = pick(row, ["id_athlete", "athlete_id"])
      const avatar = resolveActorAvatar(row, athleteId, athleteAvatarMap)
      return {
        __key: rowKey(id, index),
        id: id === "-" ? fallbackId(index) : id,
        equipeNationaleId: pick(row, ["id_equipe_nationale", "equipe_nationale_id"]),
        equipeNationaleNom: pick(row, ["nom_equipe_nationale", "equipe_nationale"]),
        athleteId,
        athleteNom: avatar.displayName || pick(row, ["nom_athlete", "athlete", "nom_complet"]),
        avatarUrl: avatar.avatarUrl,
        equipeId: pick(row, ["id_equipe", "equipe_id"]),
        equipeNom: pick(row, ["nom_equipe", "equipe"]),
        clubId: pick(row, ["id_club", "club_id"]),
        clubNom: pick(row, ["nom_club", "club"]),
        categorie: pick(row, ["categorie", "catégorie", "category"]),
        genre: pick(row, ["genre", "sexe", "version"]),
        saison: pick(row, ["saison", "season", "annee_sportive"]),
        dateDebutSelection: pick(row, ["date_debut_selection", "date_debut", "debut_selection"]),
        dateFinSelection: pick(row, ["date_fin_selection", "date_fin", "fin_selection"]),
        statutSelection: pick(row, ["statut_selection", "statut", "status", "etat"]),
        observation: pick(row, ["observation", "observations", "note", "commentaire"]),
      }
    })

    return NextResponse.json({ selections })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ selections: [], error: message }, { status: 500 })
  }
}
