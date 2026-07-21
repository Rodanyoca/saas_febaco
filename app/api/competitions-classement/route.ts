import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-session"
import { fallbackId, pick, readCompetitionRows, rowKey } from "../competitions/_helpers"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 })

    const rows = await readCompetitionRows("competitions_classement")
    const classements = rows.map((row, index) => {
      const id = pick(row, ["id_classement", "id", "code_classement"])
      return {
        __key: rowKey(id, index),
        id: id === "-" ? fallbackId(index) : id,
        competitionId: pick(row, ["id_competition", "competition_id"]),
        competitionNom: pick(row, ["nom_competition", "competition"]),
        phase: pick(row, ["phase", "tour"]),
        poule: pick(row, ["poule", "groupe"]),
        uniteId: pick(row, ["id_unite", "unite_id"]),
        uniteNom: pick(row, ["nom_unite", "unite", "nom_equipe"]),
        matchJoue: pick(row, ["match_joue", "matches_joues", "mj"]),
        victoire: pick(row, ["victoire", "victoires", "v"]),
        defaite: pick(row, ["defaite", "défaite", "defaites", "d"]),
        nul: pick(row, ["nul", "nuls", "n"]),
        points: pick(row, ["points", "pts"]),
        scorePour: pick(row, ["score_pour", "points_pour", "pp"]),
        scoreContre: pick(row, ["score_contre", "points_contre", "pc"]),
        difference: pick(row, ["difference", "différence", "diff"]),
        rang: pick(row, ["rang", "rank", "classement"]),
      }
    })

    return NextResponse.json({ classements })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ classements: [], error: message }, { status: 500 })
  }
}

