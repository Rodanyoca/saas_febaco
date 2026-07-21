import { NextResponse } from "next/server"
import { pickFirst, readSheetRows } from "@/lib/google-sheets"
import { getSessionUser } from "@/lib/auth-session"

export const dynamic = "force-dynamic"

function normalizeId(value: unknown): string {
  return String(value ?? "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .toLowerCase()
}

export async function GET(req: Request) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const filterAthleteId = normalizeId(searchParams.get("athleteId"))
    if (!filterAthleteId) {
      return NextResponse.json({ transferts: [], error: "id_athlete requis." }, { status: 400 })
    }

    const rows = await readSheetRows({
      block: "affiliations",
      sheet: "ATHLETE_AFFILIATIONS",
      range: "A:ZZ",
    })

    const filteredRows = rows.filter((row) => {
      const athleteId = normalizeId(pickFirst(row, ["id_athlete"]))
      return athleteId === filterAthleteId
    })

    const sortedRows = [...filteredRows].sort((a, b) => {
      return pickFirst(a, ["date_debut"]).localeCompare(pickFirst(b, ["date_debut"]))
    })

    const transferts = sortedRows.map((row, index) => {
      const id = pickFirst(row, ["id_affiliation"])
      const athleteId = pickFirst(row, ["id_athlete"])
      const athleteNom = pickFirst(row, ["nom_athlete"])
      const equipeOrigineId = pickFirst(row, ["id_equipe_origine"])
      const equipeOrigine = pickFirst(row, ["nom_equipe_origine"])
      const clubOrigineId = pickFirst(row, ["id_club_origine"])
      const clubOrigine = pickFirst(row, ["nom_club_origine"])
      const equipeBeneficiaireId = pickFirst(row, ["id_equipe_beneficiare", "id_equipe_beneficiaire"])
      const equipeBeneficiaire = pickFirst(row, [
        "nom_equipe_beneficiaire",
        "nom_equipe_beneficiare",
        "nom_equipe_origine_2",
      ])
      const clubBeneficiaireId = pickFirst(row, ["id_club_beneficiaire"])
      const clubBeneficiaire = pickFirst(row, ["nom_club_beneficiaire"])
      const saison = pickFirst(row, ["saison"])
      const dateDebut = pickFirst(row, ["date_debut"])
      const dateFin = pickFirst(row, ["date_fin"])
      const statut = pickFirst(row, ["statut_affiliation"])
      const observation = pickFirst(row, ["observation"])

      return {
        __key: `${id || athleteId}__${index}`,
        id,
        athleteId: athleteId || "",
        athleteNom: athleteNom || "-",
        equipeOrigineId: equipeOrigineId || "",
        equipeOrigine: equipeOrigine || "-",
        clubOrigineId: clubOrigineId || "",
        clubOrigine: clubOrigine || "-",
        equipeBeneficiaireId: equipeBeneficiaireId || "",
        equipeBeneficiaire: equipeBeneficiaire || "-",
        clubDestinationId: clubBeneficiaireId || "",
        clubDestination: clubBeneficiaire || "-",
        typeTransfert: "Affiliation",
        saison: saison || "-",
        dateDebut: dateDebut || "-",
        dateFin: dateFin || "-",
        statut: statut || "-",
        observation: observation || "-",
      }
    })

    return NextResponse.json({ transferts })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[api/transferts]", message)
    return NextResponse.json({ transferts: [], error: message }, { status: 500 })
  }
}
