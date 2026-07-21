import { pickFirst, readSheetRows, type SheetRow } from "@/lib/google-sheets"

export function normalize(value: unknown): string {
  return String(value ?? "").trim().toLowerCase()
}

export function fallbackId(index: number): string {
  return `row_${index + 2}`
}

export function rowKey(id: string, index: number): string {
  return `${id || fallbackId(index)}__${index + 2}`
}

export function pick(row: SheetRow, keys: string[]): string {
  return pickFirst(row, keys) || "-"
}

export async function readCompetitionRows(sheetName: string) {
  return readSheetRows(sheetName)
}

