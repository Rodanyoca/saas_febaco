import assert from "node:assert/strict"
import test from "node:test"
import { readFile } from "node:fs/promises"
import { loadDashboardData } from "../lib/dashboard/data"

test("charge chaque classeur du dashboard au maximum une fois", async () => {
  const calls: string[] = []
  const result = await loadDashboardData({
    batch: async ({ block }: { block: string }) => {
      calls.push(block)
      if (block === "affiliations") return { ATHLETE_AFFILIATIONS: Array.from({ length: 145 }, (_, index) => ({ id_affiliation_athlete: `A${index}`, id_statut_affiliation: index < 125 ? "SAF001" : "SAF002" })) }
      if (block === "licences") return { ATHLETE_LICENCES: [{ id_licence: "LIC1", id_statut_licence: "STL001" }], ACTEURS_LICENCES: [{ id_licence: "LIC2", id_type_acteur: "TAC002", id_statut_licence: "STL002", date_fin_validite: "2025-12-31" }] }
      if (block === "referentiel") return { STATUTS_AFFILIATION: [{ id_statut_affiliation: "SAF001", nom_statut_affiliation: "ACTIVE" }, { id_statut_affiliation: "SAF002", nom_statut_affiliation: "INACTIVE" }], STATUT_LICENCE: [{ id_statut_licence: "STL001", nom_statut_licence: "ACTIVE" }, { id_statut_licence: "STL002", nom_statut_licence: "EXPIREE" }], DISCIPLINES: [], CATEGORIES_AGE: [], SEXES: [] }
      return {}
    },
  } as never)
  assert.equal(new Set(calls).size, calls.length)
  assert.equal(calls.length, 7)
  assert.deepEqual({ total: result.affiliationSummary.total, active: result.affiliationSummary.active, inactive: result.affiliationSummary.inactive }, { total: 145, active: 125, inactive: 20 })
  assert.deepEqual({ total: result.licenceSummary.total, active: result.licenceSummary.active, expired: result.licenceSummary.expired }, { total: 2, active: 1, expired: 1 })
})

test("le navigateur charge le dashboard par une seule route agrégée", async () => {
  const source = await readFile("app/dashboard/page.tsx", "utf8")
  assert.match(source, /fetch\("\/api\/dashboard"/)
  assert.doesNotMatch(source, /mapWithConcurrency\(sources/)
  assert.doesNotMatch(source, /fetch\("\/api\/equipes-nationales"/)
})
