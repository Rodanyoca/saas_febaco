import assert from "node:assert/strict"
import test from "node:test"
import { readFile } from "node:fs/promises"
import { summarizeDashboardAffiliations, summarizeDashboardLicences } from "../lib/dashboard/affiliation-summary"

test("compte toutes les affiliations actives et inactives au-delà de la première page", () => {
  const rows = [
    ...Array.from({ length: 125 }, () => ({ statut: "ACTIVE" })),
    ...Array.from({ length: 20 }, () => ({ statut: "INACTIVE" })),
  ]
  assert.deepEqual(summarizeDashboardAffiliations(rows), {
    total: 145,
    active: 125,
    inactive: 20,
    unknown: 0,
    statuses: [
      { label: "ACTIVE", count: 125, rate: 86 },
      { label: "INACTIVE", count: 20, rate: 14 },
    ],
  })
})

test("le dashboard utilise le total global fourni avant pagination", async () => {
  const [dashboard, route] = await Promise.all([
    readFile("app/dashboard/page.tsx", "utf8"),
    readFile("app/api/athlete-affiliations/route.ts", "utf8"),
  ])
  assert.match(route, /summary = summarizeDashboardAffiliations\(affiliations\)/)
  assert.match(dashboard, /value=\{affiliationSummary\.total\.toLocaleString/)
  assert.doesNotMatch(dashboard, /label="Affiliations" value=\{data\.affiliations\.length/)
  assert.match(dashboard, /title="Affiliations et licences"/)
  assert.match(dashboard, /rows=\{licenceSummary\.families\}/)
})

test("répartit les licences FEBACO par famille comme le dashboard FEVOCO", () => {
  const summary = summarizeDashboardLicences(
    [{ id_statut_licence: "STL001" }],
    [{ id_type_acteur: "TAC002", id_statut_licence: "STL001" }, { id_type_acteur: "TAC004", id_statut_licence: "STL002", date_fin_validite: "2025-12-31" }],
    [{ id_statut_licence: "STL001", nom_statut_licence: "ACTIVE" }, { id_statut_licence: "STL002", nom_statut_licence: "EXPIREE" }],
    "2026-09-29",
  )
  assert.deepEqual({ total: summary.total, active: summary.active, expired: summary.expired }, { total: 3, active: 2, expired: 1 })
  assert.deepEqual(summary.families.map((row) => [row.label, row.total]), [["Athlètes", 1], ["Entraîneurs", 1], ["Arbitres", 1], ["Médecins", 0], ["Officiels", 0]])
})
