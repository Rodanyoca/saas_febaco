export type DataRow = Record<string, unknown>

export type StatusSummary = { total: number; active: number; inactive: number; unknown: number }
export type CompletionSummary = { total: number; complete: number; incomplete: number; rate: number }

export function clean(value: unknown): string {
  const text = String(value ?? "").trim()
  return ["", "-", "n/a", "na", "null", "undefined"].includes(text.toLowerCase()) ? "" : text
}

export function percent(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0
}

export function statusSummary(rows: DataRow[], field = "statut"): StatusSummary {
  let active = 0
  let inactive = 0
  for (const row of rows) {
    const status = clean(row[field]).toLowerCase()
    if (["actif", "active", "en cours", "valide", "validée", "validee"].includes(status)) active++
    else if (["inactif", "inactive", "terminé", "termine", "expiré", "expire", "annulé", "annule"].includes(status)) inactive++
  }
  return { total: rows.length, active, inactive, unknown: rows.length - active - inactive }
}

export function sexSummary(rows: DataRow[], field = "sexe") {
  let men = 0
  let women = 0
  for (const row of rows) {
    const value = clean(row[field]).toLowerCase()
    if (["m", "masculin", "homme", "male"].includes(value)) men++
    else if (["f", "féminin", "feminin", "femme", "female"].includes(value)) women++
  }
  return { men, women, unknown: rows.length - men - women }
}

export function completionSummary(rows: DataRow[], requiredFields: string[]): CompletionSummary {
  const complete = rows.filter((row) => requiredFields.every((field) => clean(row[field]))).length
  return { total: rows.length, complete, incomplete: rows.length - complete, rate: percent(complete, rows.length) }
}

export function groupCount(rows: DataRow[], field: string) {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const label = clean(row[field]) || "Non renseigné"
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  return [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "fr"))
}

export function groupStatuses(rows: DataRow[], field: string) {
  return groupCount(rows, field).map((item) => ({ ...item, rate: percent(item.count, rows.length) }))
}

export function missingFields(rows: DataRow[], block: string, fields: { key: string; label: string }[]) {
  return fields.map((field) => {
    const count = rows.filter((row) => !clean(row[field.key])).length
    return { block, field: field.label, count, rate: percent(count, rows.length), priority: count === 0 ? "Aucune" : percent(count, rows.length) >= 30 ? "Élevée" : "À surveiller" }
  }).filter((item) => item.count > 0).sort((a, b) => b.count - a.count)
}

export function countActors(blocks: DataRow[][]) {
  return blocks.reduce((total, rows) => total + rows.length, 0)
}
