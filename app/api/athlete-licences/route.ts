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
    const filterAthleteId = normalizeId(searchParams.get("athleteId"))
    if (!filterAthleteId) {
      return NextResponse.json({ licences: [], error: "id_athlete requis." }, { status: 400 })
    }

    const rows = await readSheetRows({
      block: "affiliations",
      sheet: "ATHLETE_LICENCE",
      range: "A:ZZ",
    })

    const filteredRows = rows.filter((row) => {
      const athleteId = normalizeId(pickFirst(row, ["id_athlete"]))
      return athleteId === filterAthleteId
    })

    const sortedRows = [...filteredRows].sort((a, b) =>
      pickFirst(b, ["saison"]).localeCompare(pickFirst(a, ["saison"]))
    )

    const licences = sortedRows.map((row, index) => {
      const id = pickFirst(row, ["id_licence"])
      const athleteId = pickFirst(row, ["id_athlete"])
      const equipeNom = pickFirst(row, ["nom_equipe"])
      const clubNom = pickFirst(row, ["nom_club"])

      return {
        __key: `${id || athleteId}__${index}`,
        id,
        athleteId,
        athleteNom: pickFirst(row, ["nom_athlete"]) || "-",
        affiliationId: pickFirst(row, ["id_affiliation"]),
        equipeId: pickFirst(row, ["id_equipe"]),
        equipeNom: equipeNom || "-",
        clubId: pickFirst(row, ["id_club"]),
        clubNom: clubNom || "-",
        structure: clubNom || equipeNom || "-",
        saison: pickFirst(row, ["saison"]) || "-",
        numero: pickFirst(row, ["numero_licence"]) || "-",
        dateDelivrance: pickFirst(row, ["date_delivrance"]) || "-",
        dateFinValidite: pickFirst(row, ["date_fin_validite"]) || "-",
        statut: pickFirst(row, ["statut"]) || "-",
        observation: pickFirst(row, ["observation"]) || "-",
      }
    })

    return NextResponse.json({ licences })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[api/athlete-licences]", message)
    return NextResponse.json({ licences: [], error: message }, { status: 500 })
  }
}
