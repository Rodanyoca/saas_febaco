import { loadEnvConfig } from "@next/env"
import { google } from "googleapis"

loadEnvConfig(process.cwd())

async function main() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  })
  const api = google.sheets({ version: "v4", auth })
  const spreadsheetId = process.env.GOOGLE_SHEETS_AFFILIATIONS_ID!
  const meta = await api.spreadsheets.get({ spreadsheetId, fields: "properties.title,sheets.properties" })
  console.log("BOOK", meta.data.properties?.title, JSON.stringify(meta.data.sheets?.map(sheet => sheet.properties)))
  for (const sheet of meta.data.sheets ?? []) {
    const title = sheet.properties?.title ?? ""
    const result = await api.spreadsheets.values.get({ spreadsheetId, range: `'${title.replace(/'/g, "''")}'!A:Z` })
    const values = result.data.values ?? []
    console.log("SHEET", title, "NONEMPTY_ROWS", Math.max(0, values.length - 1), "VALUES", JSON.stringify(values.slice(0, 10)))
  }
  const refs = await api.spreadsheets.values.batchGet({
    spreadsheetId: process.env.GOOGLE_SHEETS_REFERENTIEL_ID!,
    ranges: ["'STATUTS_AFFILIATION'!A:F", "'TYPES_AFFILIATION'!A:F", "'FONCTIONS'!A:F", "'TYPES_STRUCTURES'!A:F"],
  })
  console.log("REFS", JSON.stringify(refs.data.valueRanges))
}

void main()
