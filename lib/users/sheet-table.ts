import type { SheetRow } from "./types"
export type UsersTable = { headers: string[]; rows: SheetRow[] }
function cell(value: unknown): string { return typeof value === "boolean" ? String(value).toUpperCase() : String(value ?? "") }
export function mapUsersTable(values: unknown[][]): UsersTable {
  const headers = (values[0] || []).map(value => String(value ?? "").trim())
  const named = headers.filter(Boolean)
  if (new Set(named).size !== named.length) throw new Error("En-têtes utilisateurs dupliqués.")
  const rows = values.slice(1).filter(row => row.some(value => cell(value).trim())).map(row =>
    Object.fromEntries(headers.flatMap((header,index) => header ? [[header,cell(row[index])]] : [])))
  return {headers,rows}
}
export function userCellUpdates(name: string, values: unknown[][], idColumn: string, idValue: string, updates: SheetRow) {
  const headers = (values[0] || []).map(value => String(value ?? "").trim())
  if (new Set(headers.filter(Boolean)).size !== headers.filter(Boolean).length) throw new Error("En-têtes utilisateurs dupliqués.")
  const idIndex = headers.indexOf(idColumn)
  if (idIndex < 0) throw new Error("Colonne identifiant absente.")
  const matches = values.flatMap((row,index) => index > 0 && cell(row[idIndex]).trim() === idValue ? [index] : [])
  if (matches.length !== 1) throw new Error("Ligne utilisateur absente ou ambiguë.")
  const rowNumber = matches[0] + 1
  return Object.entries(updates).filter(([header])=>header!==idColumn).map(([header,value])=>{
    const index=headers.indexOf(header)
    if(index<0)throw new Error("Colonne utilisateur absente : "+header)
    let n=index+1,letter=""
    while(n){n--;letter=String.fromCharCode(65+n%26)+letter;n=Math.floor(n/26)}
    return {range:"'"+name.replaceAll("'","''")+"'!"+letter+rowNumber,values:[[value]]}
  })
}
