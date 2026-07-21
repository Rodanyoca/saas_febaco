import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-session"
import { fallbackId, pick, readCompetitionRows, rowKey } from "../competitions/_helpers"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 })

    const rows = await readCompetitionRows("competitions_resultats")
    const resultats = rows.map((row, index) => {
      const id = pick(row, ["id_resultat", "id", "code_resultat", "code_match"])
      return {
        __key: rowKey(id, index),
        id: id === "-" ? fallbackId(index) : id,
        competitionId: pick(row, ["id_competition", "competition_id"]),
        competitionNom: pick(row, ["nom_competition", "competition"]),
        dateMatch: pick(row, ["date_match", "date"]),
        phase: pick(row, ["phase", "tour"]),
        poule: pick(row, ["poule", "groupe"]),
        uniteAId: pick(row, ["id_unite_a", "unite_a_id"]),
        uniteANom: pick(row, ["nom_unite_a", "unite_a", "equipe_a"]),
        uniteBId: pick(row, ["id_unite_b", "unite_b_id"]),
        uniteBNom: pick(row, ["nom_unite_b", "unite_b", "equipe_b"]),
        qt1A: pick(row, ["qt1_a", "q1_a"]),
        qt1B: pick(row, ["qt1_b", "q1_b"]),
        qt2A: pick(row, ["qt2_a", "q2_a"]),
        qt2B: pick(row, ["qt2_b", "q2_b"]),
        qt3A: pick(row, ["qt3_a", "q3_a"]),
        qt3B: pick(row, ["qt3_b", "q3_b"]),
        qt4A: pick(row, ["qt4_a", "q4_a"]),
        qt4B: pick(row, ["qt4_b", "q4_b"]),
        prolongationA: pick(row, ["prolongation_a", "ot_a"]),
        prolongationB: pick(row, ["prolongation_b", "ot_b"]),
        scoreTotalA: pick(row, ["score_total_a", "score_a", "total_a"]),
        scoreTotalB: pick(row, ["score_total_b", "score_b", "total_b"]),
        vainqueur: pick(row, ["vainqueur", "winner"]),
        statut: pick(row, ["statut_match", "statut", "status", "etat"]),
      }
    })

    return NextResponse.json({ resultats })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ resultats: [], error: message }, { status: 500 })
  }
}

