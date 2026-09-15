import { groupStatuses, statusSummary, type DataRow } from "@/lib/dashboard/calculations"

export type DashboardAffiliationSummary = ReturnType<typeof summarizeDashboardAffiliations>

export function summarizeDashboardAffiliations(rows: DataRow[]) {
  return { ...statusSummary(rows), statuses: groupStatuses(rows, "statut") }
}
