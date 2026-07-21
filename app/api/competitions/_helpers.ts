import { pickFirst, readSheetRows, type SheetRow } from "@/lib/google-sheets"

export function normalize(value: unknown): string {
  return String(value ?? "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .toLowerCase()
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

export function rawPick(row: SheetRow, keys: string[]): string {
  return pickFirst(row, keys)
}

export function matchesId(value: unknown, expected: string): boolean {
  return !expected || normalize(value) === normalize(expected)
}

export async function readCompetitionRows(sheetName: string) {
  return readSheetRows({
    block: "competitions",
    sheet: sheetName,
    range: "A:ZZ",
  })
}
