export type ImportExportMode = "IMPORT" | "EXPORT"
export type ExportActionId = "ADD_NEW_ATHLETES" | "PREPARE_COMPETITION"

export type GenerateNewAthletesTemplateInput = {
  season: string
  leagueId: string
  ententeId: string
}

export type TemplateGenerationResult = {
  fileName: string
  generatedAt: string
  leagueId: string
  ententeId: string
  teamsCount: number
}

export type NewAthletesReferenceRow = {
  idEquipe: string
  nomEquipe: string
  idClub: string
  nomClub: string
  idEntente: string
  nomEntente: string
  idLigue: string
  nomLigue: string
  statutEquipe: string
}

export type GenerateCompetitionTemplateInput = {
  season: string
  competitionId: string
  teamIds: string[]
}

export type CompetitionStructureRow = NewAthletesReferenceRow

export type CompetitionAthleteRow = {
  idAthlete: string
  nomAthlete: string
  sexe: string
  dateNaissance: string
  idPoste: string
  nomPoste: string
  idEquipe: string
  nomEquipe: string
  idClub: string
  nomClub: string
  idEntente: string
  nomEntente: string
  idLigue: string
  nomLigue: string
  statutAthlete: string
  statutAffiliation: string
}
