import { readSheetRowsBatch, invalidateSheetReadCache } from "./google-sheets"
import { getSheetsReadClient, getSheetsWriteClient } from "./google-clients"
import { CURRENT_SEASON_KEY, SETTINGS_HEADERS, SeasonSettingsError, resolveSeasonSettings, validateSeasonChange, type SeasonSettings } from "./current-season-domain"

const PARAMETER_SHEET = "PARAMETRES_SYSTEME"
function spreadsheetId() {
  const id = process.env.GOOGLE_SHEETS_REFERENTIEL_ID?.trim()
  if (!id) throw new SeasonSettingsError("REFERENTIEL_INDISPONIBLE", "Le classeur des référentiels n’est pas configuré.", 503)
  return id
}

export async function loadSeasonSettings(): Promise<SeasonSettings> {
  try {
    // Toujours frais : les autres instances observent une sélection persistée dès la prochaine requête.
    const data = await readSheetRowsBatch({ block: "referentiel", sheets: ["SAISON", PARAMETER_SHEET], fresh: true })
    return resolveSeasonSettings(data.SAISON, data[PARAMETER_SHEET])
  } catch (error) {
    if (error instanceof SeasonSettingsError) throw error
    throw new SeasonSettingsError("PARAMETRES_INDISPONIBLES", "La configuration de la saison est indisponible. Vérifiez la feuille PARAMETRES_SYSTEME du classeur des référentiels.", 503)
  }
}

let writing: Promise<unknown> = Promise.resolve()
export function saveCurrentSeason(id: unknown, expectedId: unknown, actorId: string): Promise<SeasonSettings> {
  const task = writing.catch(() => undefined).then(async () => {
    const settings = await loadSeasonSettings(), season = validateSeasonChange(settings, id)
    if (typeof expectedId !== "string" || settings.currentSeasonId !== expectedId) throw new SeasonSettingsError("SAISON_MODIFIEE", "La saison a changé depuis l’ouverture de la page. Actualisez avant de réessayer.", 409)
    const workbook = spreadsheetId()
    const result = await getSheetsReadClient().spreadsheets.values.get({ spreadsheetId: workbook, range: "'PARAMETRES_SYSTEME'!A:ZZ" }, { timeout: 15000, retry: false })
    const [headers = [], ...rows] = result.data.values || []
    const keys = headers.map(value => String(value ?? "").trim().toLowerCase())
    if (SETTINGS_HEADERS.some(key => !keys.includes(key))) throw new SeasonSettingsError("SCHEMA_PARAMETRES_INVALIDE", "Les colonnes de PARAMETRES_SYSTEME sont incomplètes.", 409)
    const keyColumn = keys.indexOf("cle_parametre"), valueColumn = keys.indexOf("valeur_parametre")
    const matches = rows.map((row, index) => ({ row, rowNumber: index + 2 })).filter(item => String(item.row[keyColumn] ?? "").trim() === CURRENT_SEASON_KEY)
    if (matches.length !== 1) throw new SeasonSettingsError("PARAMETRE_AMBIGU", "Une seule ligne SAISON_COURANTE doit exister.", 409)
    if (String(matches[0].row[valueColumn] ?? "").trim() !== expectedId) throw new SeasonSettingsError("SAISON_MODIFIEE", "La saison a changé. Actualisez avant de réessayer.", 409)
    const column = (index: number) => { let name = ""; for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + (n - 1) % 26) + name; return name }
    const updates = { valeur_parametre: season.id, date_modification: new Date().toISOString(), modifie_par: actorId }
    // Même cellule pour tous les changements : aucune ligne ajoutée, aucun marqueur concurrent par saison.
    try {
      await getSheetsWriteClient().spreadsheets.values.batchUpdate({ spreadsheetId: workbook, requestBody: {
        valueInputOption: "RAW", data: Object.entries(updates).map(([key, value]) => ({ range: `'PARAMETRES_SYSTEME'!${column(keys.indexOf(key))}${matches[0].rowNumber}`, values: [[value]] })),
      } }, { timeout: 15000, retry: false })
    } finally { invalidateSheetReadCache("referentiel", PARAMETER_SHEET) }
    const confirmed = await loadSeasonSettings()
    if (confirmed.currentSeasonId !== season.id) throw new SeasonSettingsError("ECRITURE_NON_CONFIRMEE", "La saison enregistrée n’a pas pu être confirmée. Actualisez la page.", 409)
    return confirmed
  })
  writing = task
  return task
}
