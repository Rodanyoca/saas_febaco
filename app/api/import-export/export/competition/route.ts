import { NextResponse } from "next/server"

import { getSessionUser } from "@/lib/auth-session"
import { pickFirst, readSheetRows } from "@/lib/google-sheets"
import {
  CompetitionTemplateError,
  generateCompetitionTemplate,
} from "@/lib/import-export/generate-competition-template"
import type {
  CompetitionAthleteRow,
  CompetitionStructureRow,
  GenerateCompetitionTemplateInput,
} from "@/lib/import-export/template-types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const text = (value: unknown) => String(value ?? "").replace(/[\u200B-\u200D\uFEFF]/g, "").trim()
const normalized = (value: unknown) => text(value).normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()
const active = (value: unknown) => ["actif","saf001"].includes(normalized(value))
const sameId = (left: unknown, right: unknown) => normalized(left) === normalized(right)
const failure = (message: string, status: number) =>
  NextResponse.json({ success: false, message, error: message }, { status })

export async function POST(request: Request) {
  try {
    let body: Partial<GenerateCompetitionTemplateInput>
    try {
      body = (await request.json()) as Partial<GenerateCompetitionTemplateInput>
    } catch {
      return failure("Les paramètres de génération sont incomplets.", 400)
    }
    if (
      typeof body.season !== "string" ||
      typeof body.competitionId !== "string" ||
      !Array.isArray(body.teamIds) ||
      !body.season.trim() ||
      !body.competitionId.trim() ||
      !body.teamIds.length ||
      body.teamIds.some((id) => typeof id !== "string" || !id.trim())
    ) {
      return failure("La saison, la compétition et au moins une équipe sont obligatoires.", 400)
    }
    const requestedTeamIds = [...new Set(body.teamIds.map((id) => id.trim()))]
    if (requestedTeamIds.length > 200) return failure("Le gabarit accepte au maximum 200 équipes.", 400)

    const user = await getSessionUser()
    if (!user) return failure("Non authentifié.", 401)
    if (user.role !== "federal") return failure("Action réservée à l’administration fédérale.", 403)

    const [competitions, equipes, clubs, ententes, ligues, affiliations, athletes] =
      await Promise.all([
        readSheetRows({ block: "competitions", sheet: "competitions", range: "A:ZZ" }),
        readSheetRows({ block: "structure", sheet: "equipes", range: "A:ZZ" }),
        readSheetRows({ block: "structure", sheet: "clubs", range: "A:ZZ" }),
        readSheetRows({ block: "structure", sheet: "ententes", range: "A:ZZ" }),
        readSheetRows({ block: "structure", sheet: "ligues", range: "A:ZZ" }),
        readSheetRows({ block: "affiliations", sheet: "ATHLETE_AFFILIATIONS", range: "A:ZZ" }),
        readSheetRows({ block: "acteurs", sheet: "athletes", range: "A:ZZ" }),
      ])

    const competition = competitions.find((row) =>
      sameId(pickFirst(row, ["id_competition", "id", "code_competition", "code"]), body.competitionId)
    )
    if (!competition) return failure("La compétition sélectionnée est introuvable.", 404)
    const competitionSeason = pickFirst(competition, ["saison", "season", "annee_sportive"])
    if (!sameId(competitionSeason, body.season)) {
      return failure("La compétition n’appartient pas à la saison sélectionnée.", 400)
    }

    const selectedIdSet = new Set(requestedTeamIds.map(normalized))
    const selectedTeams = equipes.filter((row) =>
      selectedIdSet.has(normalized(pickFirst(row, ["id_equipe", "id", "code_equipe", "code"])))
    )
    const foundIds = new Set(selectedTeams.map((row) =>
      normalized(pickFirst(row, ["id_equipe", "id", "code_equipe", "code"]))
    ))
    if (foundIds.size !== selectedIdSet.size) return failure("Une ou plusieurs équipes sélectionnées sont introuvables.", 404)

    const clubById = new Map(clubs.map((row) => [normalized(pickFirst(row, ["id_club", "id"])), row]))
    const ententeById = new Map(ententes.map((row) => [normalized(pickFirst(row, ["id_entente", "id"])), row]))
    const ligueById = new Map(ligues.map((row) => [normalized(pickFirst(row, ["id_ligue", "id"])), row]))
    const structures: CompetitionStructureRow[] = selectedTeams.map((team) => {
      const idEquipe = pickFirst(team, ["id_equipe", "id", "code_equipe", "code"])
      const idClub = pickFirst(team, ["id_club", "club_id", "idclub"])
      const club = clubById.get(normalized(idClub))
      const idEntente = pickFirst(team, ["id_entente", "entente_id", "identente"]) ||
        (club ? pickFirst(club, ["id_entente"]) : "")
      const entente = ententeById.get(normalized(idEntente))
      const idLigue = pickFirst(team, ["id_ligue", "ligue_id", "idligue"]) ||
        (entente ? pickFirst(entente, ["id_ligue"]) : "") ||
        (club ? pickFirst(club, ["id_ligue"]) : "")
      const ligue = ligueById.get(normalized(idLigue))
      return {
        idEquipe,
        nomEquipe: pickFirst(team, ["nom_equipe", "nom", "designation"]),
        idClub,
        nomClub: pickFirst(team, ["nom_club", "club", "club_nom"]) ||
          (club ? pickFirst(club, ["nom_club", "nom"]) : ""),
        idEntente,
        nomEntente: pickFirst(team, ["nom_entente", "entente", "entente_nom"]) ||
          (entente ? pickFirst(entente, ["nom_entente", "nom"]) : ""),
        idLigue,
        nomLigue: pickFirst(team, ["nom_ligue", "ligue", "ligue_nom"]) ||
          (ligue ? pickFirst(ligue, ["nom_ligue", "nom"]) : ""),
        statutEquipe: pickFirst(team, ["statut_equipe", "statut", "status", "etat"]),
      }
    })
    if (structures.some((row) =>
      !row.idEquipe || !row.idClub || !row.idEntente || !row.idLigue
    )) {
      return failure(
        "Une équipe sélectionnée possède des références structurelles incomplètes.",
        400
      )
    }
    const structureByTeam = new Map(structures.map((row) => [normalized(row.idEquipe), row]))
    const athleteById = new Map(athletes.map((row) => [normalized(pickFirst(row, ["id_athlete"])), row]))
    const seenAthletes = new Set<string>()
    const activeAthletes: CompetitionAthleteRow[] = []

    for (const affiliation of affiliations) {
      const teamId = pickFirst(affiliation, ["id_equipe"])
      if (!selectedIdSet.has(normalized(teamId))) continue
      if (!active(pickFirst(affiliation, ["id_statut_affiliation"]))) continue
      const athleteId = pickFirst(affiliation, ["id_athlete"])
      const athlete = athleteById.get(normalized(athleteId))
      if (!athlete || !athleteId) continue
      const athleteStatus = pickFirst(athlete, ["statut_athlete", "statut"])
      if (athleteStatus && !active(athleteStatus)) continue
      const dedupeKey = normalized(athleteId)
      if (seenAthletes.has(dedupeKey)) continue
      seenAthletes.add(dedupeKey)
      const structure = structureByTeam.get(normalized(teamId))
      if (!structure) continue
      activeAthletes.push({
        idAthlete: athleteId,
        nomAthlete: pickFirst(athlete, ["nom_complet"]),
        sexe: pickFirst(athlete, ["sexe"]),
        dateNaissance: pickFirst(athlete, ["date_de_naissance"]),
        idPoste: pickFirst(athlete, ["id_poste", "poste_id"]),
        nomPoste: pickFirst(athlete, ["nom_poste", "poste"]),
        idEquipe: structure.idEquipe,
        nomEquipe: structure.nomEquipe,
        idClub: structure.idClub,
        nomClub: structure.nomClub,
        idEntente: structure.idEntente,
        nomEntente: structure.nomEntente,
        idLigue: structure.idLigue,
        nomLigue: structure.nomLigue,
        statutAthlete: athleteStatus || "ACTIF",
        statutAffiliation: pickFirst(affiliation, ["id_statut_affiliation"]),
      })
    }
    if (activeAthletes.length > 500) {
      return failure("Le gabarit accepte au maximum 500 athlètes actifs.", 400)
    }

    const generated = await generateCompetitionTemplate({
      competition: {
        id: pickFirst(competition, ["id_competition", "id"]),
        nom: pickFirst(competition, ["nom_competition", "nom", "designation"]),
        saison: competitionSeason,
        dateDebut: pickFirst(competition, ["date_debut", "debut"]),
        dateFin: pickFirst(competition, ["date_fin", "fin"]),
        lieu: pickFirst(competition, ["lieu", "site", "ville"]),
        statut: pickFirst(competition, ["statut_competition", "statut", "status", "etat"]),
      },
      generatedBy: user.nom || user.email,
      structures,
      athletes: activeAthletes,
    })
    return new NextResponse(generated.buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${generated.fileName}"`,
        "X-Teams-Count": String(generated.teamsCount),
        "X-Athletes-Count": String(generated.athletesCount),
      },
    })
  } catch (error) {
    if (error instanceof CompetitionTemplateError) {
      console.error(`[import-export/competition:${error.code}]`, error)
      return failure(error.message, error.code === "TEMPLATE_NOT_FOUND" ? 404 : 500)
    }
    console.error("[import-export/competition]", error)
    return failure("La génération du fichier Excel a échoué.", 500)
  }
}
