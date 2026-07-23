import { NextResponse } from "next/server"

import { getSessionUser } from "@/lib/auth-session"
import { pickFirst, readSheetRows } from "@/lib/google-sheets"
import {
  generateNewAthletesTemplate,
  TemplateGenerationError,
} from "@/lib/import-export/generate-new-athletes-template"
import type {
  GenerateNewAthletesTemplateInput,
  NewAthletesReferenceRow,
} from "@/lib/import-export/template-types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const text = (value: unknown) => String(value ?? "").trim()
const sameId = (left: unknown, right: unknown) =>
  text(left).toLowerCase() === text(right).toLowerCase()

function failure(message: string, status: number) {
  return NextResponse.json({ success: false, message, error: message }, { status })
}

export async function POST(request: Request) {
  try {
    let body: Partial<GenerateNewAthletesTemplateInput>
    try {
      body = (await request.json()) as Partial<GenerateNewAthletesTemplateInput>
    } catch {
      return failure("Les paramètres de génération sont incomplets.", 400)
    }
    if (
      typeof body.season !== "string" ||
      typeof body.leagueId !== "string" ||
      typeof body.ententeId !== "string" ||
      !body.season.trim() ||
      !body.leagueId.trim() ||
      !body.ententeId.trim()
    ) {
      return failure("Les paramètres de génération sont incomplets.", 400)
    }

    const season = body.season.trim()
    const leagueId = body.leagueId.trim()
    const ententeId = body.ententeId.trim()
    const user = await getSessionUser()
    if (!user) return failure("Non authentifié.", 401)
    if (user.role !== "federal") {
      return failure("Action réservée à l’administration fédérale.", 403)
    }

    const [ligues, ententes, clubs, equipes] = await Promise.all([
      readSheetRows({ block: "structure", sheet: "ligues", range: "A:ZZ" }),
      readSheetRows({ block: "structure", sheet: "ententes", range: "A:ZZ" }),
      readSheetRows({ block: "structure", sheet: "clubs", range: "A:ZZ" }),
      readSheetRows({ block: "structure", sheet: "equipes", range: "A:ZZ" }),
    ])

    const ligue = ligues.find((row) =>
      sameId(pickFirst(row, ["id_ligue", "id", "code_ligue", "code"]), leagueId)
    )
    if (!ligue) return failure("La ligue sélectionnée est introuvable.", 404)

    const entente = ententes.find((row) =>
      sameId(pickFirst(row, ["id_entente", "id", "code_entente", "code"]), ententeId)
    )
    if (!entente) return failure("L’entente sélectionnée est introuvable.", 404)
    if (!sameId(pickFirst(entente, ["id_ligue", "ligue_id", "idligue"]), leagueId)) {
      return failure("L’entente sélectionnée n’appartient pas à cette ligue.", 400)
    }

    const leagueName = pickFirst(ligue, ["nom_ligue", "nom", "designation"])
    const ententeName = pickFirst(entente, ["nom_entente", "nom", "designation"])
    const scopedClubs = clubs.filter((row) =>
      sameId(pickFirst(row, ["id_entente", "entente_id", "identente"]), ententeId)
    )
    const clubById = new Map(
      scopedClubs.map((row) => [
        text(pickFirst(row, ["id_club", "club_id", "idclub"])).toLowerCase(),
        row,
      ])
    )
    const scopedTeams = equipes.filter((row) => {
      const directEntenteId = pickFirst(row, ["id_entente", "entente_id", "identente"])
      const clubId = text(pickFirst(row, ["id_club", "club_id", "idclub"])).toLowerCase()
      return directEntenteId
        ? sameId(directEntenteId, ententeId)
        : clubById.has(clubId)
    })
    if (!scopedTeams.length) {
      return failure("Aucune équipe n’a été trouvée pour cette entente.", 404)
    }

    const references: NewAthletesReferenceRow[] = scopedTeams.map((team) => {
      const clubId = pickFirst(team, ["id_club", "club_id", "idclub"])
      const club = clubById.get(text(clubId).toLowerCase())
      return {
        idEquipe: pickFirst(team, ["id_equipe", "id", "code_equipe", "code"]),
        nomEquipe: pickFirst(team, ["nom_equipe", "nom", "equipe", "designation"]),
        idClub: clubId || (club ? pickFirst(club, ["id_club"]) : ""),
        nomClub: pickFirst(team, ["nom_club", "club", "club_nom"]) ||
          (club ? pickFirst(club, ["nom_club", "nom"]) : ""),
        idEntente: ententeId,
        nomEntente: ententeName,
        idLigue: leagueId,
        nomLigue: leagueName,
        statutEquipe: pickFirst(team, ["statut_equipe", "statut", "status", "etat"]),
      }
    })

    const generated = await generateNewAthletesTemplate({
      season,
      leagueId,
      leagueName,
      ententeId,
      ententeName,
      generatedBy: user.nom || user.email,
      references,
    })
    return new NextResponse(generated.buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${generated.fileName}"`,
        "X-Generated-File-Name": generated.fileName,
        "X-Teams-Count": String(generated.teamsCount),
      },
    })
  } catch (error) {
    if (error instanceof TemplateGenerationError) {
      console.error(`[import-export/new-athletes:${error.code}]`, error)
      return failure(error.message, error.code === "TEMPLATE_NOT_FOUND" ? 404 : 500)
    }
    console.error("[import-export/new-athletes]", error)
    return failure("La génération du fichier Excel a échoué.", 500)
  }
}
