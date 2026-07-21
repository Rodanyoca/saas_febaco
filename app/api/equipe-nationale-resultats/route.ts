import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-session"
import { fallbackId, pick, readCompetitionRows, rowKey } from "../competitions/_helpers"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 })

    const rows = await readCompetitionRows("equipe_nationale_resultats")
    const resultats = rows.map((row, index) => {
      const id = pick(row, ["id_resultat_en", "id", "code_resultat_en"])
      return {
        __key: rowKey(id, index),
        id: id === "-" ? fallbackId(index) : id,
        participationId: pick(row, ["id_participation_en", "participation_en_id"]),
        equipeNationaleId: pick(row, ["id_equipe_nationale", "equipe_nationale_id"]),
        equipeNationaleNom: pick(row, ["nom_equipe_nationale", "equipe_nationale"]),
        competitionId: pick(row, ["id_competition", "competition_id"]),
        competitionNom: pick(row, ["nom_competition", "competition"]),
        dateMatch: pick(row, ["date_match", "date"]),
        phase: pick(row, ["phase", "tour"]),
        adversaire: pick(row, ["adversaire", "opponent"]),
        paysAdversaire: pick(row, ["pays_adversaire", "pays", "country_adversaire"]),
        qt1Rdc: pick(row, ["qt1_rdc", "q1_rdc"]),
        qt1Adversaire: pick(row, ["qt1_adversaire", "q1_adversaire"]),
        qt2Rdc: pick(row, ["qt2_rdc", "q2_rdc"]),
        qt2Adversaire: pick(row, ["qt2_adversaire", "q2_adversaire"]),
        qt3Rdc: pick(row, ["qt3_rdc", "q3_rdc"]),
        qt3Adversaire: pick(row, ["qt3_adversaire", "q3_adversaire"]),
        qt4Rdc: pick(row, ["qt4_rdc", "q4_rdc"]),
        qt4Adversaire: pick(row, ["qt4_adversaire", "q4_adversaire"]),
        prolongationRdc: pick(row, ["prolongation_rdc", "ot_rdc"]),
        prolongationAdversaire: pick(row, ["prolongation_adversaire", "ot_adversaire"]),
        scoreTotalRdc: pick(row, ["score_total_rdc", "score_rdc", "total_rdc"]),
        scoreTotalAdversaire: pick(row, ["score_total_adversaire", "score_adversaire", "total_adversaire"]),
        resultatMatch: pick(row, ["resultat_match", "résultat_match", "resultat", "vainqueur"]),
        statutMatch: pick(row, ["statut_match", "statut", "status", "etat"]),
        observation: pick(row, ["observation", "observations", "note", "commentaire"]),
      }
    })

    return NextResponse.json({ resultats })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ resultats: [], error: message }, { status: 500 })
  }
}
