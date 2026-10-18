import type { SheetRow } from "./google-sheets"
import { getEffectiveLicenseStatus } from "./actor-licences"

export function actorLicenceIndex(rows: SheetRow[], statuses: SheetRow[], typeId: string, today = new Date().toISOString().slice(0, 10)) {
  const statusById = new Map(statuses.map(row => [row.id_statut_licence?.trim(), row.nom_statut_licence?.trim()]))
  const index = new Map<string, { licenceNumero: string; licenceDisplay: string; licenceAmbiguous: boolean }>()
  for (const row of rows) {
    const actorId = row.id_acteur?.trim(), start = row.date_debut_validite?.trim() || "", end = row.date_fin_validite?.trim() || ""
    if (row.id_type_acteur?.trim() !== typeId || !actorId || !/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) continue
    if (getEffectiveLicenseStatus(statusById.get(row.id_statut_licence?.trim()) || "", start, end, today) !== "VALIDE") continue
    const previous = index.get(actorId), number = row.numero_licence?.trim() || ""
    index.set(actorId, previous ? { licenceNumero: "", licenceDisplay: "", licenceAmbiguous: true } : { licenceNumero: number, licenceDisplay: number, licenceAmbiguous: false })
  }
  return index
}

export function coachLicenceIndex(rows: SheetRow[], statuses: SheetRow[], today = new Date().toISOString().slice(0, 10)) {
  return actorLicenceIndex(rows, statuses, "TAC002", today)
}
