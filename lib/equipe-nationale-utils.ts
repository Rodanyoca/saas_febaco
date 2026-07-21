import type { ResultatEquipeNationale } from "@/lib/models"

function clean(value: string | undefined): string {
  return String(value ?? "").trim()
}

function numberValue(value: string | undefined): number {
  const parsed = Number(clean(value))
  return Number.isFinite(parsed) ? parsed : 0
}

export function displaySync(value: string | undefined): string {
  return clean(value) || "-"
}

export function nationalScoreTotal(resultat: ResultatEquipeNationale, side: "a" | "b"): number {
  const explicit = side === "a" ? resultat.scoreTotalA : resultat.scoreTotalB
  if (clean(explicit)) return numberValue(explicit)
  return side === "a"
    ? numberValue(resultat.qt1A) + numberValue(resultat.qt2A) + numberValue(resultat.qt3A) + numberValue(resultat.qt4A) + numberValue(resultat.prolongationA)
    : numberValue(resultat.qt1B) + numberValue(resultat.qt2B) + numberValue(resultat.qt3B) + numberValue(resultat.qt4B) + numberValue(resultat.prolongationB)
}

export function nationalScoreLabel(resultat: ResultatEquipeNationale): string {
  return `${nationalScoreTotal(resultat, "a")} - ${nationalScoreTotal(resultat, "b")}`
}

export function matchOutcome(resultat: ResultatEquipeNationale): "Victoire" | "Défaite" | "Égalité" {
  const a = nationalScoreTotal(resultat, "a")
  const b = nationalScoreTotal(resultat, "b")
  return a > b ? "Victoire" : a < b ? "Défaite" : "Égalité"
}
