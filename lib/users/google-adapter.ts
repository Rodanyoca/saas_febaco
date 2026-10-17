import { getSheetsReadClient, getSheetsWriteClient } from "../google-clients"
import { getUsersSpreadsheetId } from "./config"
import { mapUsersTable, userCellUpdates, type UsersTable } from "./sheet-table"
import { invalidateDirectory } from "./cache-invalidation"
import type { UsersSheetsAdapter } from "./types"

const pending = new Map<string, Promise<Record<string, UsersTable>>>()
const range = (name: string) => "'" + name.replaceAll("'", "''") + "'!A:ZZ"
const options = { timeout: 15_000, retry: false }
export async function readUsersTables(names: readonly string[]) {
  const sheets = [...new Set(names)].sort(), spreadsheetId = getUsersSpreadsheetId(), key = spreadsheetId + sheets.join("|")
  let request = pending.get(key)
  if (!request) {
    request = getSheetsReadClient().spreadsheets.values.batchGet({ spreadsheetId, ranges: sheets.map(range) }, options).then(result =>
      Object.fromEntries(sheets.map((name,index) => [name, mapUsersTable(result.data.valueRanges?.[index]?.values || [])]))
    ).catch(() => { throw new Error("Source utilisateurs indisponible.") }).finally(() => pending.delete(key))
    pending.set(key, request)
  }
  return request
}
export function createGoogleUsersSheetsAdapter(seed: Record<string, UsersTable> = {}): UsersSheetsAdapter {
  const tables = new Map(Object.entries(seed))
  const read = async (name: string) => {
    let table = tables.get(name)
    if (!table) { table = (await readUsersTables([name]))[name]; tables.set(name,table) }
    return table
  }
  return {
    async readHeaders(name) { return (await read(name)).headers },
    async readRows(name) { return (await read(name)).rows.map(row => ({ ...row })) },
    async appendRow(name,row) {
      const table = await read(name)
      try {
        await getSheetsWriteClient().spreadsheets.values.append({ spreadsheetId:getUsersSpreadsheetId(),range:range(name),valueInputOption:"RAW",insertDataOption:"INSERT_ROWS",requestBody:{values:[table.headers.map(header=>row[header]??"")]} },options)
      } catch { throw new Error("Écriture utilisateurs indisponible.") }
      finally { tables.delete(name); if (["USERS","USER_AUTORISATIONS"].includes(name)) invalidateDirectory() }
    },
    async updateRow(name,idColumn,id,updates) {
      try {
        const spreadsheetId=getUsersSpreadsheetId(),client=getSheetsWriteClient()
        const current=await client.spreadsheets.values.get({spreadsheetId,range:range(name)},options)
        const data=userCellUpdates(name,current.data.values||[],idColumn,id,updates)
        await client.spreadsheets.values.batchUpdate({spreadsheetId,requestBody:{valueInputOption:"RAW",data}},options)
      } catch { throw new Error("Mise à jour utilisateurs indisponible.") }
      finally { tables.delete(name); if (["USERS","USER_AUTORISATIONS"].includes(name)) invalidateDirectory() }
    },
  }
}
