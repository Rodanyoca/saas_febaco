import { groupStatuses, statusSummary, type DataRow } from "@/lib/dashboard/calculations"

export type DashboardAffiliationSummary = ReturnType<typeof summarizeDashboardAffiliations>
export type DashboardLicenceSummary = ReturnType<typeof summarizeDashboardLicences>

export function summarizeDashboardAffiliations(rows: DataRow[]) {
  return { ...statusSummary(rows), statuses: groupStatuses(rows, "statut") }
}

const normalize = (value: unknown) => String(value ?? "").trim().normalize("NFD").replace(/\p{Diacritic}/gu, "").toUpperCase()

export function summarizeDashboardLicences(athleteRows: DataRow[], actorRows: DataRow[], statusRows: DataRow[], today = new Date().toISOString().slice(0, 10)) {
  const statuses = new Map(statusRows.map((row) => [String(row.id_statut_licence ?? "").trim(), normalize(row.nom_statut_licence)]))
  const expired = (row: DataRow) => statuses.get(String(row.id_statut_licence ?? "").trim())?.includes("EXPIRE") || Boolean(String(row.date_fin_validite ?? "").trim() && String(row.date_fin_validite) < today)
  const active = (row: DataRow) => statuses.get(String(row.id_statut_licence ?? "").trim()) === "ACTIVE" && !expired(row)
  const families = [
    { label: "Athlètes", rows: athleteRows },
    { label: "Entraîneurs", rows: actorRows.filter((row) => row.id_type_acteur === "TAC002") },
    { label: "Arbitres", rows: actorRows.filter((row) => row.id_type_acteur === "TAC004") },
    { label: "Médecins", rows: actorRows.filter((row) => row.id_type_acteur === "TAC005") },
    { label: "Officiels", rows: actorRows.filter((row) => row.id_type_acteur === "TAC003") },
  ].map(({ label, rows }) => ({ label, total: rows.length, active: rows.filter(active).length, expired: rows.filter(expired).length }))
  const all = [...athleteRows, ...actorRows]
  return { total: all.length, active: all.filter(active).length, expired: all.filter(expired).length, families }
}
