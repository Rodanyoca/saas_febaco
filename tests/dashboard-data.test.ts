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
      if (block === "referentiel") return { STATUTS_AFFILIATION: [{ id_statut_affiliation: "SAF001", nom_statut_affiliation: "ACTIVE" }, { id_statut_affiliation: "SAF002", nom_statut_affiliation: "INACTIVE" }], DISCIPLINES: [], CATEGORIES_AGE: [], SEXES: [] }
      return {}
    },
  } as never)
  assert.equal(new Set(calls).size, calls.length)
  assert.equal(calls.length, 6)
  assert.deepEqual({ total: result.affiliationSummary.total, active: result.affiliationSummary.active, inactive: result.affiliationSummary.inactive }, { total: 145, active: 125, inactive: 20 })
})

test("le navigateur charge le dashboard par une seule route agrégée", async () => {
  const source = await readFile("app/dashboard/page.tsx", "utf8")
  assert.match(source, /fetch\("\/api\/dashboard"/)
  assert.doesNotMatch(source, /mapWithConcurrency\(sources/)
  assert.doesNotMatch(source, /fetch\("\/api\/equipes-nationales"/)
})
