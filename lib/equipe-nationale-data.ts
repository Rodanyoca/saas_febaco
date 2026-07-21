import "server-only"

import { pickFirst, readSheetRows, type SheetRow } from "@/lib/google-sheets"
import type {
  CompetitionEquipeNationale,
  EquipeNationale,
  ResultatEquipeNationale,
  SelectionEquipeNationale,
} from "@/lib/models"

function value(row: SheetRow, key: string): string {
  return pickFirst(row, [key])
}

function key(id: string, index: number): string {
  return `${id}__${index + 2}`
}

function sameId(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase()
}

async function rows(sheet: string): Promise<SheetRow[]> {
  return readSheetRows({ block: "equipeNationale", sheet, range: "A:ZZ" })
}

export async function getEquipesNationales(): Promise<EquipeNationale[]> {
  return (await rows("EQUIPE_NATIONALE")).flatMap((row, index) => {
    const id = value(row, "id_equipe_nationale")
    if (!id) return []
    return [{
      __key: key(id, index), id,
      nom: value(row, "nom_equipe_nationale"),
      discipline: value(row, "discipline"),
      categorie: value(row, "categorie"),
      sexe: value(row, "sexe"),
      saison: value(row, "saison"),
      statut: value(row, "statut_equipe"),
    }]
  })
}

export async function getEquipeNationaleById(id: string) {
  return (await getEquipesNationales()).find((item) => sameId(item.id, id))
}

export async function getSelections(): Promise<SelectionEquipeNationale[]> {
  return (await rows("SELECTION")).flatMap((row, index) => {
    const id = value(row, "id_selection")
    if (!id) return []
    return [{
      __key: key(id, index), id,
      equipeNationaleId: value(row, "id_equipe_nationale"),
      equipeNationaleNom: value(row, "nom_equipe_nationale"),
      saison: value(row, "saison"), athleteId: value(row, "id_athlete"),
      athleteNom: value(row, "nom_athlete"), sexe: value(row, "sexe"),
      posteId: value(row, "id_poste"), posteNom: value(row, "nom_poste"),
      equipeId: value(row, "id_equipe"), equipeNom: value(row, "nom_equipe"),
      clubId: value(row, "id_club"), clubNom: value(row, "nom_club"),
      statutSelection: value(row, "statut_selection"), observation: value(row, "observation"),
    }]
  })
}

export async function getSelectionsByEquipeId(id: string) {
  return (await getSelections()).filter((item) => sameId(item.equipeNationaleId, id))
}

export async function getCompetitionsEquipeNationale(): Promise<CompetitionEquipeNationale[]> {
  return (await rows("COMPETITIONS_EQUIPE_NATIONALE")).flatMap((row, index) => {
    const id = value(row, "id_participation_en")
    if (!id) return []
    return [{
      __key: key(id, index), id,
      equipeNationaleId: value(row, "id_equipe_nationale"), equipeNationaleNom: value(row, "nom_equipe_nationale"),
      discipline: value(row, "discipline"), categorie: value(row, "categorie"), sexe: value(row, "sexe"),
      competitionId: value(row, "id_competition"), competitionNom: value(row, "nom_competition"),
      typeCompetition: value(row, "type_competition"), disciplineId: value(row, "id_discipline"),
      saison: value(row, "saison"), dateDebut: value(row, "date_debut"), dateFin: value(row, "date_fin"),
      statutParticipation: value(row, "statut_participation"),
    }]
  })
}

export async function getCompetitionsByEquipeId(id: string) {
  return (await getCompetitionsEquipeNationale()).filter((item) => sameId(item.equipeNationaleId, id))
}

export async function getCompetitionEquipeNationaleById(id: string) {
  return (await getCompetitionsEquipeNationale()).find((item) => sameId(item.id, id))
}

export async function getResultatsEquipeNationale(): Promise<ResultatEquipeNationale[]> {
  return (await rows("EQUIPE_NATIONALE_RESULTATS")).flatMap((row, index) => {
    const id = value(row, "id_resultat_en")
    if (!id) return []
    return [{
      __key: key(id, index), id, participationId: value(row, "id_participation_en"),
      equipeNationaleId: value(row, "id_equipe_nationale"), equipeNationaleNom: value(row, "nom_equipe_nationale"),
      discipline: value(row, "discipline"), categorie: value(row, "categorie"), sexe: value(row, "sexe"),
      competitionId: value(row, "id_competition"), competitionNom: value(row, "nom_competition"),
      dateMatch: value(row, "date_match"), phase: value(row, "phase"), nomAdversaire: value(row, "nom_adversaire"),
      paysAdversaire: value(row, "pays_adversaire"), qt1A: value(row, "qt1_a"), qt1B: value(row, "qt1_b"),
      qt2A: value(row, "qt2_a"), qt2B: value(row, "qt2_b"), qt3A: value(row, "qt3_a"), qt3B: value(row, "qt3_b"),
      qt4A: value(row, "qt4_a"), qt4B: value(row, "qt4_b"), prolongationA: value(row, "prolongation_a"),
      prolongationB: value(row, "prolongation_b"), scoreTotalA: value(row, "score_total_a"), scoreTotalB: value(row, "score_total_b"),
      uniteVainqueurId: value(row, "id_unite_vainqueur"), uniteVainqueurNom: value(row, "nom_unite_vainqueur"),
      statutMatch: value(row, "statut_match"),
    }]
  })
}

export async function getResultatsByEquipeId(id: string) {
  return (await getResultatsEquipeNationale()).filter((item) => sameId(item.equipeNationaleId, id))
}

export async function getResultatsByParticipationId(id: string) {
  return (await getResultatsEquipeNationale()).filter((item) => sameId(item.participationId, id))
}

export async function getResultatEquipeNationaleById(id: string) {
  return (await getResultatsEquipeNationale()).find((item) => sameId(item.id, id))
}
