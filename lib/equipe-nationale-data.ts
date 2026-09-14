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
  const [equipes, saisons] = await Promise.all([rows("EQUIPES_NATIONALES"), rows("EQUIPES_NATIONALES_SAISONS")])
  return equipes.flatMap((row, index) => {
    const id = value(row, "id_equipe_nationale")
    if (!id) return []
    const saison = saisons.filter((item) => sameId(value(item, "id_equipe_nationale"), id)).sort((a, b) => value(b, "id_saison").localeCompare(value(a, "id_saison"), "fr", { numeric: true }))[0]
    return [{
      __key: key(id, index), id,
      nom: value(row, "nom_equipe_nationale"),
      discipline: value(row, "id_discipline"),
      categorie: value(row, "id_categorie_age"),
      sexe: value(row, "id_sexe"),
      saison: value(saison || {}, "id_saison"),
      statut: value(saison || {}, "statut"),
    }]
  })
}

export async function getEquipeNationaleById(id: string) {
  return (await getEquipesNationales()).find((item) => sameId(item.id, id))
}

export async function getSelections(): Promise<SelectionEquipeNationale[]> {
  const [selections, campagnes, saisons, equipes] = await Promise.all([rows("SELECTIONS_ATHLETES"), rows("CAMPAGNES_EQUIPES_NATIONALES"), rows("EQUIPES_NATIONALES_SAISONS"), rows("EQUIPES_NATIONALES")])
  const campagneById = new Map(campagnes.map((row) => [value(row, "id_campagne_equipe_nationale"), row])), saisonById = new Map(saisons.map((row) => [value(row, "id_equipe_nationale_saison"), row])), equipeById = new Map(equipes.map((row) => [value(row, "id_equipe_nationale"), row]))
  return selections.flatMap((row, index) => {
    const id = value(row, "id_selection")
    if (!id) return []
    const campagne = campagneById.get(value(row, "id_campagne_equipe_nationale")) || {}, saison = saisonById.get(value(campagne, "id_equipe_nationale_saison")) || {}, equipeId = value(saison, "id_equipe_nationale"), equipe = equipeById.get(equipeId) || {}
    return [{
      __key: key(id, index), id,
      equipeNationaleId: equipeId,
      equipeNationaleNom: value(equipe, "nom_equipe_nationale"),
      saison: value(saison, "id_saison"), athleteId: value(row, "id_athlete"),
      athleteNom: value(row, "nom_athlete"), sexe: value(row, "sexe"),
      posteId: value(row, "id_poste"), posteNom: value(row, "nom_poste"),
      equipeId: value(row, "id_equipe"), equipeNom: value(row, "nom_equipe"),
      clubId: value(row, "id_club"), clubNom: value(row, "nom_club"),
      statutSelection: value(row, "id_statut_selection"), observation: value(row, "observations"),
    }]
  })
}

export async function getSelectionsByEquipeId(id: string) {
  return (await getSelections()).filter((item) => sameId(item.equipeNationaleId, id))
}

export async function getCompetitionsEquipeNationale(): Promise<CompetitionEquipeNationale[]> {
  const [engagements, campagnes, saisons, equipes] = await Promise.all([rows("ENGAGEMENTS_EQUIPE_NATIONALE"), rows("CAMPAGNES_EQUIPES_NATIONALES"), rows("EQUIPES_NATIONALES_SAISONS"), rows("EQUIPES_NATIONALES")])
  const campagneById = new Map(campagnes.map((row) => [value(row, "id_campagne_equipe_nationale"), row])), saisonById = new Map(saisons.map((row) => [value(row, "id_equipe_nationale_saison"), row])), equipeById = new Map(equipes.map((row) => [value(row, "id_equipe_nationale"), row]))
  return engagements.flatMap((row, index) => {
    const id = value(row, "id_engagement_equipe_nationale")
    if (!id) return []
    const campagne = campagneById.get(value(row, "id_campagne_equipe_nationale")) || {}, saison = saisonById.get(value(campagne, "id_equipe_nationale_saison")) || {}, equipeId = value(saison, "id_equipe_nationale"), equipe = equipeById.get(equipeId) || {}, epreuveId = value(row, "id_epreuve_competition")
    return [{
      __key: key(id, index), id,
      equipeNationaleId: equipeId, equipeNationaleNom: value(equipe, "nom_equipe_nationale"),
      discipline: value(equipe, "id_discipline"), categorie: value(equipe, "id_categorie_age"), sexe: value(equipe, "id_sexe"),
      competitionId: epreuveId, competitionNom: epreuveId,
      typeCompetition: "", disciplineId: value(equipe, "id_discipline"),
      saison: value(saison, "id_saison"), dateDebut: value(campagne, "date_debut"), dateFin: value(campagne, "date_fin"),
      statutParticipation: value(row, "statut"),
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
  // Le classeur canonique ne contient pas de feuille de résultats dédiée.
  // Les résultats seront résolus depuis les compétitions lorsque cette relation sera définie.
  return []
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
