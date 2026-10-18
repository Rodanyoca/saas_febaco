import test from "node:test"
import assert from "node:assert/strict"
import { coachLicenceIndex } from "../lib/coach-licence-index"

const statuses = [{ id_statut_licence: "ACTIVE", nom_statut_licence: "ACTIVE" }, { id_statut_licence: "SUSP", nom_statut_licence: "SUSPENDUE" }]
const licence = (actor: string, start: string, end: string, number = "00123", status = "ACTIVE", type = "TAC002") => ({ id_acteur: actor, id_type_acteur: type, numero_licence: number, id_statut_licence: status, date_debut_validite: start, date_fin_validite: end })

test("coachs : licence actuellement valide uniquement, bornes inclusives et numéro conservé", () => {
  const rows = [licence("C1", "2026-01-01", "2026-12-31"), licence("C2", "2026-10-18", "2026-10-18", "002"), licence("C3", "2025-01-01", "2025-12-31"), licence("C4", "2027-01-01", "2027-12-31"), licence("C5", "2026-01-01", "2026-12-31", "123", "SUSP"), licence("C6", "2026-01-01", "2026-12-31", "456", "ACTIVE", "TAC003"), licence("C7", "", "2026-12-31")]
  const index = coachLicenceIndex(rows, statuses, "2026-10-18")
  assert.deepEqual([...index.keys()], ["C1", "C2"])
  assert.equal(index.get("C1")?.licenceDisplay, "00123")
  assert.equal(index.get("C2")?.licenceDisplay, "002")
  assert.equal(coachLicenceIndex(rows, [], "2026-10-18").size, 0)
})

test("coachs : plusieurs licences valides sont signalées, sans choix arbitraire ni repli historique", () => {
  const rows = [licence("C1", "2026-01-01", "2026-12-31", "111"), licence("C1", "2026-01-01", "2026-12-31", "222"), licence("C1", "2025-01-01", "2025-12-31", "OLD"), licence("C2", "2026-01-01", "2026-12-31", "")]
  assert.deepEqual(coachLicenceIndex(rows, statuses, "2026-10-18").get("C1"), { licenceNumero: "", licenceDisplay: "", licenceAmbiguous: true })
  assert.equal(coachLicenceIndex(rows, statuses, "2026-10-18").get("C2")?.licenceDisplay, "")
  assert.deepEqual(coachLicenceIndex(rows, statuses, "2027-01-01").size, 0)
})
