import type { SheetRow } from "@/lib/google-sheets"

export type NationalIdKind = "team" | "season" | "campaign" | "selection" | "staff" | "engagement"

const formats: Record<NationalIdKind, (year: string) => RegExp> = {
  team: () => /^BKB-EN-(\d{3})$/,
  season: (year) => new RegExp(`^BKB-ENS-${year}-(\\d{3})$`),
  campaign: (year) => new RegExp(`^BKB-CEN-${year}-\\d{3}-(\\d{3})$`),
  selection: (year) => new RegExp(`^BKB-SEL-${year}-\\d{3}-(\\d{3})$`),
  staff: (year) => new RegExp(`^BKB-ASN-${year}-\\d{3}-(\\d{3})$`),
  engagement: (year) => new RegExp(`^BKB-EEN-${year}-\\d{3}-(\\d{3})$`),
}

const prefixes: Record<NationalIdKind, (year: string) => string> = {
  team: () => "BKB-EN-", season: (year) => `BKB-ENS-${year}-`,
  campaign: (year) => `BKB-CEN-${year}-001-`, selection: (year) => `BKB-SEL-${year}-001-`,
  staff: (year) => `BKB-ASN-${year}-001-`, engagement: (year) => `BKB-EEN-${year}-001-`,
}

export function generateNationalId(kind: NationalIdKind, year: string, ids: string[], ownerSequence = "001") {
  const safeYear = /^\d{4}$/.test(year) ? year : String(new Date().getFullYear())
  const re = formats[kind](safeYear)
  const next = Math.max(0, ...ids.map((id) => id.match(re)).filter((match): match is RegExpMatchArray => !!match).map((match) => Number(match[1]))) + 1
  const prefix = prefixes[kind](safeYear).replace("-001-", `-${ownerSequence.padStart(3, "0")}-`)
  return `${prefix}${String(next).padStart(3, "0")}`
}

const transitions: Record<string, string[]> = { SCA001: ["SCA002", "SCA004"], SCA002: ["SCA003", "SCA004"] }
export function assertCampaignTransition(from: string, to: string) {
  if (from === to) return
  if (!transitions[from]?.includes(to)) throw new Error("Transition de campagne interdite.")
}

export function normalizeEngagementRow(row: SheetRow): SheetRow & { id_statut_engagement: string } {
  return { ...row, id_statut_engagement: row.id_statut_engagement || row.statut || "" }
}

export function assertDates(start: string, end: string) {
  if (start && end && start > end) throw new Error("La date de début doit précéder la date de fin.")
}

export function sequenceFromId(id: string) { return id.split("-").at(-1) || "001" }

export function resolveNationalYear(input: Record<string, unknown>, fallback = String(new Date().getFullYear())) {
  const season = String(input.id_saison ?? "")
  const startDate = String(input.date_debut ?? "")
  return season.match(/\d{4}/)?.[0] || startDate.match(/^\d{4}/)?.[0] || fallback
}
