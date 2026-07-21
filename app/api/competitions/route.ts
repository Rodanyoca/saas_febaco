import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-session"
import { fallbackId, pick, readCompetitionRows, rowKey } from "./_helpers"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 })

    const rows = await readCompetitionRows("competitions")
    const competitions = rows.map((row, index) => {
      const id = pick(row, ["id_competition", "id", "code_competition", "code"])
      return {
        __key: rowKey(id, index),
        id: id === "-" ? fallbackId(index) : id,
        nom: pick(row, ["nom_competition", "competition", "nom", "designation"]),
        saison: pick(row, ["saison", "season", "annee_sportive"]),
        categorie: pick(row, ["categorie", "catégorie", "category"]),
        genre: pick(row, ["genre", "sexe", "version"]),
        niveau: pick(row, ["niveau", "level"]),
        dateDebut: pick(row, ["date_debut", "date_début", "debut"]),
        dateFin: pick(row, ["date_fin", "fin"]),
        lieu: pick(row, ["lieu", "site", "ville"]),
        statut: pick(row, ["statut", "statut_competition", "status", "etat"]),
      }
    })

    return NextResponse.json({ competitions })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ competitions: [], error: message }, { status: 500 })
  }
}

