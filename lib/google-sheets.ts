import { google } from "googleapis"

const SHEETS_REQUEST_TIMEOUT_MS = 10000
const SHEETS_CACHE_TTL_MS = 30_000
const readCache = new Map<string, { expiresAt: number; value: unknown[][] }>()
const pendingReads = new Map<string, Promise<unknown[][]>>()

export type SheetBlock =
  | "structure"
  | "referentiel"
  | "users"
  | "acteurs"
  | "affiliations"
  | "competitions"
  | "equipeNationale"
  | "importExport"

const spreadsheetEnvByBlock: Record<SheetBlock, string> = {
  structure: "GOOGLE_SHEETS_STRUCTURE_ID",
  referentiel: "GOOGLE_SHEETS_REFERENTIEL_ID",
  users: "GOOGLE_SHEETS_USERS_ID",
  acteurs: "GOOGLE_SHEETS_ACTEURS_ID",
  affiliations: "GOOGLE_SHEETS_AFFILIATIONS_ID",
  competitions: "GOOGLE_SHEETS_COMPETITIONS_ID",
  equipeNationale: "GOOGLE_SHEETS_EQUIPE_NATIONALE_ID",
  importExport: "GOOGLE_SHEETS_IMPORT_EXPORT_ID",
}

const sheetBlockByName: Record<string, SheetBlock> = {
  provinces: "structure",
  ligues: "structure",
  ententes: "structure",
  clubs: "structure",
  equipes: "structure",
  athletes: "acteurs",
  coachs: "acteurs",
  medecins: "acteurs",
  arbitres: "acteurs",
  officiels: "acteurs",
  affiliations: "affiliations",
  competitions: "competitions",
  competitions_participants: "competitions",
  competitions_unites: "competitions",
  competitions_resultats: "competitions",
  competitions_classement: "competitions",
  participants: "competitions",
  unites: "competitions",
  resultats: "competitions",
  classement: "competitions",
  selections: "equipeNationale",
  competitions_nationales: "equipeNationale",
  resultats_nationaux: "equipeNationale",
  users: "users",
}

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`)
  }
  return value
}

function getSpreadsheetId(block: SheetBlock): string {
  const envName = spreadsheetEnvByBlock[block]
  const value = process.env[envName] ?? (block === "referentiel" ? "1hoW2S9NRzhhtBuXtkLnMqOSdhYyjKtDEVPHQr7pVQRg" : undefined)
  if (!value) {
    throw new Error(`Spreadsheet ID absent pour le bloc '${block}' (${envName}).`)
  }
  return value
}

function getPrivateKey(): string {
  const raw = requiredEnv("GOOGLE_PRIVATE_KEY")
  return raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw
}

function normalizeHeader(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

function createSheetsClient() {
  const auth = new google.auth.JWT({
    email: requiredEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
    key: getPrivateKey(),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  })

  return google.sheets({ version: "v4", auth })
}

function createSheetsClientReadWrite() {
  const auth = new google.auth.JWT({
    email: requiredEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
    key: getPrivateKey(),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  })

  return google.sheets({ version: "v4", auth })
}

function quoteSheetName(sheetName: string): string {
  return `'${sheetName.replace(/'/g, "''")}'`
}

function inferBlockFromSheetName(sheetName: string): SheetBlock {
  const normalized = normalizeHeader(sheetName)
  const block = sheetBlockByName[normalized]
  if (!block) {
    throw new Error(`Bloc métier introuvable pour la feuille '${sheetName}'.`)
  }
  return block
}

function withGoogleSheetsErrorContext(error: unknown, block: SheetBlock, sheetName: string): Error {
  const message = error instanceof Error ? error.message : String(error)
  return new Error(`Lecture Google Sheets impossible pour '${block}/${sheetName}': ${message}`)
}

export type SheetRow = Record<string, string>

type ReadSheetParams = {
  block?: SheetBlock
  sheet: string
  range?: string
  fresh?: boolean
}

type ReadSheetRowsOptions = {
  block?: SheetBlock
  range?: string
}

export async function readSheet(params: ReadSheetParams): Promise<unknown[][]> {
  const block = params.block ?? inferBlockFromSheetName(params.sheet)
  const spreadsheetId = getSpreadsheetId(block)
  const range = params.range ?? "A:ZZ"
  const cacheKey = `${spreadsheetId}:${params.sheet.toLowerCase()}:${range}`
  const cached = params.fresh ? undefined : readCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.value
  if (cached) readCache.delete(cacheKey)

  const pending = params.fresh ? undefined : pendingReads.get(cacheKey)
  if (pending) return pending

  const request = (async () => {
    const sheets = createSheetsClient()
    const sheetNameVariants = Array.from(new Set([params.sheet, params.sheet.toUpperCase(), params.sheet.toLowerCase()]))
    let lastError: unknown

    for (const candidate of sheetNameVariants) {
      try {
        const res = await sheets.spreadsheets.values.get(
        {
          spreadsheetId,
          range: `${quoteSheetName(candidate)}!${range}`,
        },
        {
          timeout: SHEETS_REQUEST_TIMEOUT_MS,
        }
      )

        const values = res.data.values ?? []
        if (readCache.size >= 100) {
          const now = Date.now()
          for (const [key, entry] of readCache) if (entry.expiresAt <= now) readCache.delete(key)
          if (readCache.size >= 100) readCache.clear()
        }
        if (!params.fresh) readCache.set(cacheKey, { expiresAt: Date.now() + SHEETS_CACHE_TTL_MS, value: values })
        return values
      } catch (error) {
        lastError = error
      }
    }

    throw withGoogleSheetsErrorContext(lastError, block, params.sheet)
  })()

  if (!params.fresh) pendingReads.set(cacheKey, request)
  try {
    return await request
  } finally {
    pendingReads.delete(cacheKey)
  }
}

export async function readSheetRows(params: string | ReadSheetParams, options: ReadSheetRowsOptions = {}): Promise<SheetRow[]> {
  const values = await readSheet(
    typeof params === "string"
      ? { sheet: params, block: options.block, range: options.range }
      : params
  )

  if (values.length === 0) return []

  const [headerRow, ...dataRows] = values
  const headerOccurrences = new Map<string, number>()
  const headers = (headerRow ?? []).map((h) => {
    const header = normalizeHeader(String(h ?? ""))
    if (!header) return ""

    const occurrence = (headerOccurrences.get(header) ?? 0) + 1
    headerOccurrences.set(header, occurrence)
    return occurrence === 1 ? header : `${header}_${occurrence}`
  })

  return dataRows
    .filter((row) => row?.some((cell) => String(cell ?? "").trim() !== ""))
    .map((row) => {
      const obj: SheetRow = {}
      for (let i = 0; i < headers.length; i++) {
        const key = headers[i]
        if (!key) continue
        obj[key] = String(row?.[i] ?? "").trim()
      }
      return obj
    })
}

export function pickFirst(row: SheetRow, keys: string[]): string {
  for (const k of keys) {
    const v = row[k]
    if (typeof v === "string" && v.trim() !== "") return v.trim()
  }
  return ""
}

function columnIndexToA1(colIndexZeroBased: number): string {
  let n = colIndexZeroBased + 1
  let s = ""
  while (n > 0) {
    const r = (n - 1) % 26
    s = String.fromCharCode(65 + r) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

function clearSheetCache(spreadsheetId: string, sheetName: string) {
  const prefix = `${spreadsheetId}:${sheetName.toLowerCase()}:`
  for (const key of readCache.keys()) if (key.startsWith(prefix)) readCache.delete(key)
}

export async function writeSheetRowByHeaders({
  block,
  sheet,
  idHeader,
  id,
  values,
  mode,
}: {
  block: SheetBlock
  sheet: string
  idHeader: string
  id: string
  values: Record<string, string>
  mode: "create" | "update"
}): Promise<SheetRow> {
  const spreadsheetId = getSpreadsheetId(block)
  const client = createSheetsClientReadWrite()
  const response = await client.spreadsheets.values.get({
    spreadsheetId,
    range: `${quoteSheetName(sheet)}!A:ZZ`,
  }, { timeout: SHEETS_REQUEST_TIMEOUT_MS })
  const rows = response.data.values ?? []
  if (!rows.length) throw new Error("SCHEMA_INDISPONIBLE")

  const headers = (rows[0] ?? []).map((value) => normalizeHeader(String(value ?? "")))
  const idColumn = headers.indexOf(normalizeHeader(idHeader))
  if (idColumn < 0) throw new Error("SCHEMA_INDISPONIBLE")
  for (const key of Object.keys(values)) if (!headers.includes(normalizeHeader(key))) throw new Error("SCHEMA_INDISPONIBLE")

  const existingIndex = rows.slice(1).findIndex((row) => String(row?.[idColumn] ?? "").trim() === id)
  if (mode === "create" && existingIndex >= 0) throw new Error("IDENTIFIANT_DUPLIQUE")
  if (mode === "update" && existingIndex < 0) throw new Error("INTROUVABLE")

  const rowNumber = mode === "create" ? rows.length + 1 : existingIndex + 2
  const previous = mode === "create" ? [] : rows[rowNumber - 1] ?? []
  const next = headers.map((header, index) => {
    if (header === normalizeHeader(idHeader)) return id
    return Object.prototype.hasOwnProperty.call(values, header) ? values[header] : String(previous[index] ?? "")
  })

  await client.spreadsheets.values.update({
    spreadsheetId,
    range: `${quoteSheetName(sheet)}!A${rowNumber}:${columnIndexToA1(headers.length - 1)}${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [next] },
  }, { timeout: SHEETS_REQUEST_TIMEOUT_MS })
  clearSheetCache(spreadsheetId, sheet)

  return Object.fromEntries(headers.map((header, index) => [header, String(next[index] ?? "").trim()]))
}

export async function getAvatarTargetByEntityId({
  sheetName,
  entityId,
  entityIdHeaderCandidates,
  block = "acteurs",
}: {
  sheetName: string
  entityId: string
  entityIdHeaderCandidates: string[]
  block?: SheetBlock
}): Promise<{ avatarDriveId: string; avatarDriveUrl: string }> {
  const spreadsheetId = getSpreadsheetId(block)
  const sheets = createSheetsClientReadWrite()
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${quoteSheetName(sheetName)}!A:ZZ`,
  }, { timeout: SHEETS_REQUEST_TIMEOUT_MS })
  const values = response.data.values ?? []
  if (values.length === 0) throw new Error(`Feuille '${sheetName}' vide ou introuvable`)

  const [headerRow, ...dataRows] = values
  const headers = (headerRow ?? []).map((header) => normalizeHeader(String(header ?? "")))
  const candidates = entityIdHeaderCandidates.map(normalizeHeader)
  const entityIdColumn = headers.findIndex((header) => candidates.includes(header))
  const avatarIdColumn = headers.findIndex((header) => header === "avatar_drive_id")
  const avatarUrlColumn = headers.findIndex((header) => header === "avatar_drive_url")
  if (entityIdColumn < 0) throw new Error(`Colonne ID introuvable dans '${sheetName}'`)
  if (avatarIdColumn < 0 || avatarUrlColumn < 0) throw new Error(`Colonnes avatar_drive_id / avatar_drive_url introuvables dans '${sheetName}'`)

  const row = dataRows.find((candidate) => String(candidate?.[entityIdColumn] ?? "").trim() === entityId.trim())
  if (!row) throw new Error("Ligne Google Sheets introuvable")
  return {
    avatarDriveId: String(row[avatarIdColumn] ?? "").trim(),
    avatarDriveUrl: String(row[avatarUrlColumn] ?? "").trim(),
  }
}

export async function updateAvatarFieldsByEntityId({
  sheetName,
  entityId,
  entityIdHeaderCandidates,
  avatarDriveId,
  avatarDriveUrl,
  block,
}: {
  sheetName: string
  entityId: string
  entityIdHeaderCandidates: string[]
  avatarDriveId: string
  avatarDriveUrl: string
  block?: SheetBlock
}): Promise<{ rowNumber: number }> {
  const resolvedBlock = block ?? inferBlockFromSheetName(sheetName)
  const spreadsheetId = getSpreadsheetId(resolvedBlock)
  const sheets = createSheetsClientReadWrite()

  const res = await sheets.spreadsheets.values.get(
    {
      spreadsheetId,
      range: `${sheetName}!A:ZZ`,
    },
    {
      timeout: SHEETS_REQUEST_TIMEOUT_MS,
    }
  )

  const values = res.data.values ?? []
  if (values.length === 0) {
    throw new Error(`Feuille '${sheetName}' vide ou introuvable`)
  }

  const [headerRow, ...dataRows] = values
  const headers = (headerRow ?? []).map((h) => normalizeHeader(String(h ?? "")))

  const idHeadersNormalized = entityIdHeaderCandidates.map((h) => normalizeHeader(h))
  const idColIndex = headers.findIndex((h) => idHeadersNormalized.includes(h))
  if (idColIndex < 0) {
    throw new Error(`Colonne ID introuvable dans '${sheetName}'`)
  }

  const avatarIdColIndex = headers.findIndex((h) => h === "avatar_drive_id")
  const avatarUrlColIndex = headers.findIndex((h) => h === "avatar_drive_url")
  if (avatarIdColIndex < 0 || avatarUrlColIndex < 0) {
    throw new Error(`Colonnes avatar_drive_id / avatar_drive_url introuvables dans '${sheetName}'`)
  }

  const targetRowIndex = dataRows.findIndex(
    (row) => String(row?.[idColIndex] ?? "").trim() === String(entityId).trim()
  )
  if (targetRowIndex < 0) {
    throw new Error("Ligne Google Sheets introuvable")
  }

  const rowNumber = targetRowIndex + 2
  const avatarIdA1 = `${sheetName}!${columnIndexToA1(avatarIdColIndex)}${rowNumber}`
  const avatarUrlA1 = `${sheetName}!${columnIndexToA1(avatarUrlColIndex)}${rowNumber}`

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: [
        {
          range: avatarIdA1,
          values: [[avatarDriveId]],
        },
        {
          range: avatarUrlA1,
          values: [[avatarDriveUrl]],
        },
      ],
    },
  })

  const sheetCachePrefix = `${spreadsheetId}:${sheetName.toLowerCase()}:`
  for (const key of readCache.keys()) {
    if (key.startsWith(sheetCachePrefix)) readCache.delete(key)
  }

  return { rowNumber }
}
