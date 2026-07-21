import type {
  EquipeNationaleCompetition,
  EquipeNationaleParticipant,
  EquipeNationaleResultat,
  EquipeNationaleSelection,
} from "@/lib/models"

const syncLabel = "En cours de synchronisation"

function clean(value: string | undefined): string {
  const next = String(value ?? "").trim()
  return next === "-" ? "" : next
}

function numberValue(value: string): number {
  const parsed = Number(clean(value))
  return Number.isFinite(parsed) ? parsed : 0
}

export function displaySync(value: string | undefined): string {
  return clean(value) || syncLabel
}

export function nationalScoreTotal(resultat: EquipeNationaleResultat, side: "rdc" | "adversaire"): number {
  if (side === "rdc") {
    const explicit = clean(resultat.scoreTotalRdc)
    if (explicit) return numberValue(explicit)
    return numberValue(resultat.qt1Rdc) + numberValue(resultat.qt2Rdc) + numberValue(resultat.qt3Rdc) +
      numberValue(resultat.qt4Rdc) + numberValue(resultat.prolongationRdc)
  }

  const explicit = clean(resultat.scoreTotalAdversaire)
  if (explicit) return numberValue(explicit)
  return numberValue(resultat.qt1Adversaire) + numberValue(resultat.qt2Adversaire) +
    numberValue(resultat.qt3Adversaire) + numberValue(resultat.qt4Adversaire) +
    numberValue(resultat.prolongationAdversaire)
}

export function nationalScoreLabel(resultat: EquipeNationaleResultat): string {
  return `${nationalScoreTotal(resultat, "rdc")} - ${nationalScoreTotal(resultat, "adversaire")}`
}

export function resolveSelectionParticipant(
  participant: EquipeNationaleParticipant,
  selections: EquipeNationaleSelection[]
): EquipeNationaleParticipant {
  const selection = selections.find((item) => item.id === participant.selectionId)
  if (!selection) return participant

  return {
    ...participant,
    athleteId: clean(participant.athleteId) || selection.athleteId,
    athleteNom: clean(participant.athleteNom) || selection.athleteNom,
    avatarUrl: clean(participant.avatarUrl) || selection.avatarUrl,
    equipeId: clean(participant.equipeId) || selection.equipeId,
    equipeNom: clean(participant.equipeNom) || selection.equipeNom,
    clubId: clean(participant.clubId) || selection.clubId,
    clubNom: clean(participant.clubNom) || selection.clubNom,
  }
}

export function resolveResultatCompetition(
  resultat: EquipeNationaleResultat,
  competitions: EquipeNationaleCompetition[]
): EquipeNationaleResultat {
  const participation = competitions.find((item) => item.id === resultat.participationId)
  if (!participation) return resultat

  return {
    ...resultat,
    equipeNationaleId: clean(resultat.equipeNationaleId) || participation.equipeNationaleId,
    equipeNationaleNom: clean(resultat.equipeNationaleNom) || participation.equipeNationaleNom,
    competitionId: clean(resultat.competitionId) || participation.competitionId,
    competitionNom: clean(resultat.competitionNom) || participation.competitionNom,
  }
}
