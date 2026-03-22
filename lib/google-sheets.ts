import { google } from "googleapis"

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

export type SheetRow = Record<string, string>

export async function readSheetRows(sheetName: string): Promise<SheetRow[]> {
  const spreadsheetId = requiredEnv("GOOGLE_SHEETS_SPREADSHEET_ID")
  const sheets = createSheetsClient()

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:ZZ`,
  })

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
