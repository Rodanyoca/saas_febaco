import type { SheetRow } from "./google-sheets"

export const CURRENT_SEASON_KEY = "SAISON_COURANTE"
export const SETTINGS_HEADERS = ["cle_parametre", "valeur_parametre", "type_valeur", "description", "date_modification", "modifie_par"] as const
export type SeasonOption = { id: string; label: string; status: string; disabled: boolean }
export type SeasonSettings = { seasons: SeasonOption[]; currentSeason: SeasonOption | null; currentSeasonId: string; updatedAt: string }
export class SeasonSettingsError extends Error {
  constructor(public code: string, message: string, public status = 422) { super(message) }
}
const clean = (value: unknown) => String(value ?? "").trim()
const normalized = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()

export function resolveSeasonSettings(seasons: SheetRow[], parameters: SheetRow[], statuses: SheetRow[] = []): SeasonSettings {
  const statusById = new Map(statuses.map(row => [clean(row.id_statut_saison), clean(row.nom_statut_saison || row.nom_statut)]))
  const ids = new Set<string>()
  const options = seasons.filter(row => clean(row.id_saison)).map(row => {
    const id = clean(row.id_saison)
    if (ids.has(id)) throw new SeasonSettingsError("SAISON_AMBIGUE", "Le référentiel contient un identifiant de saison dupliqué.", 409)
    ids.add(id)
    const status = statusById.get(clean(row.id_statut_saison)) || clean(row.statut || row.id_statut_saison)
    return { id, label: clean(row.nom_saison) || id, status, disabled: ["ANNULEE", "ANNULE"].includes(normalized(status)) }
  })
  const matches = parameters.filter(row => clean(row.cle_parametre) === CURRENT_SEASON_KEY)
  if (matches.length !== 1) throw new SeasonSettingsError("PARAMETRE_AMBIGU", "Une seule ligne SAISON_COURANTE doit exister dans PARAMETRES_SYSTEME.", 409)
  const currentSeasonId = clean(matches[0].valeur_parametre)
  const currentSeason = options.find(season => season.id === currentSeasonId) || null
  if (currentSeasonId && (!currentSeason || currentSeason.disabled)) throw new SeasonSettingsError("SAISON_COURANTE_INVALIDE", "La saison courante configurée est inconnue ou annulée. Vérifiez PARAMETRES_SYSTEME.", 409)
  return { seasons: options, currentSeason, currentSeasonId, updatedAt: clean(matches[0].date_modification) }
}

export function validateSeasonChange(settings: SeasonSettings, id: unknown): SeasonOption {
  if (typeof id !== "string" || !id.trim()) throw new SeasonSettingsError("SAISON_REQUISE", "Sélectionnez une saison.")
  const season = settings.seasons.find(item => item.id === id.trim())
  if (!season) throw new SeasonSettingsError("SAISON_INCONNUE", "La saison sélectionnée n’existe pas.")
  if (season.disabled) throw new SeasonSettingsError("SAISON_ANNULEE", "Une saison annulée ne peut pas devenir la saison courante.")
  return season
}

export type AthleteSeasonLicence = { licenceNumero: string; licenceDisplay: string; licenceState: "ACTIVE" | "MISSING" | "INACTIVE" | "AMBIGUOUS" }
export function currentSeasonLicenceIndex(rows: SheetRow[], seasonId: string): Map<string, AthleteSeasonLicence> {
  const candidates = new Map<string, SheetRow[]>()
  if (!seasonId) return new Map()
  for (const row of rows) {
    const athleteId = clean(row.id_athlete)
    if (!athleteId || clean(row.id_saison) !== seasonId) continue
    const group = candidates.get(athleteId)
    if (group) group.push(row); else candidates.set(athleteId, [row])
  }
  return new Map([...candidates].map(([id, licences]): [string, AthleteSeasonLicence] => {
    if (licences.length > 1) return [id, { licenceNumero: "", licenceDisplay: "Licence ambiguë", licenceState: "AMBIGUOUS" }]
    const row = licences[0], number = clean(row.numero_licence)
    // FEBACO: licence saisonnière, sans période de validité individuelle ; STL001 = ACTIVE.
    if (clean(row.id_statut_licence) !== "STL001") return [id, { licenceNumero: "", licenceDisplay: "", licenceState: "INACTIVE" }]
    return [id, { licenceNumero: number, licenceDisplay: number || "", licenceState: number ? "ACTIVE" : "MISSING" }]
  }))
}

export const missingSeasonLicence: AthleteSeasonLicence = { licenceNumero: "", licenceDisplay: "", licenceState: "MISSING" }
export function compareLicenceNumbers(a: { licenceNumero?: string; nomComplet?: string; id: string }, b: { licenceNumero?: string; nomComplet?: string; id: string }, direction: "asc" | "desc" = "asc") {
  const left = clean(a.licenceNumero), right = clean(b.licenceNumero)
  if (!left || !right) { if (left) return -1; if (right) return 1 }
  const comparison = left.localeCompare(right, "fr", { numeric: true, sensitivity: "base" })
  return (direction === "desc" ? -comparison : comparison) || clean(a.nomComplet).localeCompare(clean(b.nomComplet), "fr", { sensitivity: "base" }) || a.id.localeCompare(b.id)
}
