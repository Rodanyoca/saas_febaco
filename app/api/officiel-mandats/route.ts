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
    const filterActeurId = normalizeId(searchParams.get("acteurId"))
    if (!filterActeurId) {
      return NextResponse.json({ mandats: [], error: "id_acteur requis." }, { status: 400 })
    }

    const rows = await readSheetRows({
      block: "affiliations",
      sheet: "MANDATS",
      range: "A:ZZ",
    })

    const filteredRows = rows.filter(
      (row) => normalizeId(pickFirst(row, ["id_acteur"])) === filterActeurId
    )

    const sortedRows = [...filteredRows].sort((a, b) =>
      pickFirst(b, ["date_debut"]).localeCompare(pickFirst(a, ["date_debut"]))
    )

    const mandats = sortedRows.map((row, index) => {
      const id = pickFirst(row, ["id_mandat"])
      const acteurId = pickFirst(row, ["id_acteur"])

      return {
        __key: `${id || acteurId}__${index}`,
        id,
        acteurId,
        acteurNom: pickFirst(row, ["nom_acteur"]) || "-",
        fonction: pickFirst(row, ["fonction"]) || "-",
        structureId: pickFirst(row, ["id_structure"]),
        structureNom: pickFirst(row, ["nom_structure"]) || "-",
        dateDebut: pickFirst(row, ["date_debut"]) || "-",
        dateFin: pickFirst(row, ["date_fin"]) || "-",
        statut: pickFirst(row, ["statut_mandat"]) || "-",
        observation: pickFirst(row, ["observation"]) || "-",
      }
    })

    return NextResponse.json({ mandats })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[api/officiel-mandats]", message)
    return NextResponse.json({ mandats: [], error: message }, { status: 500 })
  }
}
