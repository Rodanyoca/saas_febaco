import { NextResponse } from "next/server"

import { getSessionUser } from "@/lib/auth-session"
import { pickFirst, readSheetRows } from "@/lib/google-sheets"

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
    const filterCoachId = normalizeId(searchParams.get("coachId"))
    if (!filterCoachId) {
      return NextResponse.json({ affiliations: [], error: "id_coach requis." }, { status: 400 })
    }

    const rows = await readSheetRows({
      block: "affiliations",
      sheet: "COACH_AFFILIATIONS",
      range: "A:ZZ",
    })

    const filteredRows = rows.filter(
      (row) => normalizeId(pickFirst(row, ["id_coach"])) === filterCoachId
    )

    const sortedRows = [...filteredRows].sort((a, b) => {
      const saison = pickFirst(b, ["saison"]).localeCompare(pickFirst(a, ["saison"]))
      if (saison !== 0) return saison
      return pickFirst(b, ["date_debut"]).localeCompare(pickFirst(a, ["date_debut"]))
    })

    const affiliations = sortedRows.map((row, index) => {
      const id = pickFirst(row, ["id_affiliation"])
      const coachId = pickFirst(row, ["id_coach"])
      const equipeNom = pickFirst(row, ["nom_equipe"])
      const equipeNationaleNom = pickFirst(row, ["nom_equipe_nationale"])

      return {
        __key: `${id || coachId}__${index}`,
        id,
        coachId,
        coachNom: pickFirst(row, ["nom_coach"]) || "-",
        typeAffiliation: pickFirst(row, ["type_affiliation"]) || "-",
        saison: pickFirst(row, ["saison"]) || "-",
        equipeId: pickFirst(row, ["id_equipe"]),
        equipeNom: equipeNom || equipeNationaleNom || "-",
        clubId: pickFirst(row, ["id_club"]),
        clubNom: pickFirst(row, ["nom_club"]) || "-",
        equipeNationaleId: pickFirst(row, ["id_equipe_nationale"]),
        equipeNationaleNom: equipeNationaleNom || "-",
        fonction: pickFirst(row, ["fonction"]) || "-",
        dateDebut: pickFirst(row, ["date_debut"]) || "-",
        dateFin: pickFirst(row, ["date_fin"]) || "-",
        statut: pickFirst(row, ["statut_affiliation"]) || "-",
        observation: pickFirst(row, ["observation"]) || "-",
      }
    })

    return NextResponse.json({ affiliations })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[api/coach-affiliations]", message)
    return NextResponse.json({ affiliations: [], error: message }, { status: 500 })
  }
}
