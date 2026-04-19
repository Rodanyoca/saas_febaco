import { google } from "googleapis"

const SHEETS_REQUEST_TIMEOUT_MS = 10000

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`)
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

export type SheetRow = Record<string, string>

export async function readSheetRows(sheetName: string): Promise<SheetRow[]> {
  const spreadsheetId = requiredEnv("GOOGLE_SHEETS_SPREADSHEET_ID")
  const sheets = createSheetsClient()

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
  if (values.length === 0) return []

  const [headerRow, ...dataRows] = values
  const headers = (headerRow ?? []).map((h) => normalizeHeader(String(h ?? "")))

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

export async function updateAvatarFieldsByEntityId({
  sheetName,
  entityId,
  entityIdHeaderCandidates,
  avatarDriveId,
  avatarDriveUrl,
}: {
  sheetName: string
  entityId: string
  entityIdHeaderCandidates: string[]
  avatarDriveId: string
  avatarDriveUrl: string
}): Promise<{ rowNumber: number }> {
  const spreadsheetId = requiredEnv("GOOGLE_SHEETS_SPREADSHEET_ID")
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

  return { rowNumber }
}
