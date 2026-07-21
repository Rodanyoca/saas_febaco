import type { CompetitionClassement, CompetitionResultat, CompetitionUnite } from "@/lib/models"

function toNumber(value: unknown): number | null {
  const raw = String(value ?? "").replace(/[^0-9.-]/g, "")
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

export function scoreTotal(resultat: CompetitionResultat, side: "A" | "B"): string {
  const explicit = side === "A" ? resultat.scoreTotalA : resultat.scoreTotalB
  if (String(explicit ?? "").trim() && explicit !== "-") return explicit

  const values =
    side === "A"
      ? [resultat.qt1A, resultat.qt2A, resultat.qt3A, resultat.qt4A, resultat.prolongationA]
      : [resultat.qt1B, resultat.qt2B, resultat.qt3B, resultat.qt4B, resultat.prolongationB]
  const nums = values.map(toNumber).filter((n): n is number => n !== null)
  if (nums.length === 0) return "-"
  return String(nums.reduce((sum, n) => sum + n, 0))
}

export function scoreLabel(resultat: CompetitionResultat): string {
  return `${scoreTotal(resultat, "A")} - ${scoreTotal(resultat, "B")}`
}

export function classementDifference(row: CompetitionClassement): string {
  if (row.difference && row.difference !== "-") return row.difference
  const pour = toNumber(row.scorePour)
  const contre = toNumber(row.scoreContre)
  if (pour === null || contre === null) return "-"
  return String(pour - contre)
}

export function resolveUniteName(id: string, name: string, unites: CompetitionUnite[]): string {
  if (name && name !== "-") return name
  const unite = unites.find((item) => item.id === id)
  return unite?.equipeNom && unite.equipeNom !== "-" ? unite.equipeNom : "En cours de synchronisation"
}

