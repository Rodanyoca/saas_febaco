import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-session"
import { fallbackId, pick, readCompetitionRows, rowKey } from "../competitions/_helpers"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 })

    const rows = await readCompetitionRows("equipe_nationale")
    const equipesNationales = rows.map((row, index) => {
      const id = pick(row, ["id_equipe_nationale", "id", "code_equipe_nationale", "code"])
      return {
        __key: rowKey(id, index),
        id: id === "-" ? fallbackId(index) : id,
        nom: pick(row, ["nom_equipe_nationale", "equipe_nationale", "nom", "designation"]),
        categorie: pick(row, ["categorie", "catégorie", "category"]),
        genre: pick(row, ["genre", "sexe", "version"]),
        saison: pick(row, ["saison", "season", "annee_sportive"]),
        statut: pick(row, ["statut", "statut_equipe_nationale", "status", "etat"]),
        observation: pick(row, ["observation", "observations", "note", "commentaire"]),
      }
    })

    return NextResponse.json({ equipesNationales })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ equipesNationales: [], error: message }, { status: 500 })
  }
}
