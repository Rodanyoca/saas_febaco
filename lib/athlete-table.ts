import type { Athlete } from "./models"

// Contrat explicite du tableau ordinateur/mobile, distinct de la fiche complète.
export const ATHLETE_TABLE_FIELDS = [
  "id", "__key", "nomComplet", "nom", "prenom", "avatarUrl", "sexe",
  "dateNaissance", "idNational", "idFiba", "statut",
  "licenceNumero", "licenceDisplay", "licenceState",
] as const satisfies readonly (keyof Athlete)[]

export type AthleteTableRow = Pick<Athlete, typeof ATHLETE_TABLE_FIELDS[number]>

export function projectAthleteTableRow(actor: Record<string, string>): AthleteTableRow {
  // Ne pas propager les champs ajoutés ultérieurement au modèle complet.
  return Object.fromEntries(ATHLETE_TABLE_FIELDS
    .filter(field => Object.prototype.hasOwnProperty.call(actor, field))
    .map(field => [field, actor[field]])) as AthleteTableRow
}
