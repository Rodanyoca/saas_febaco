import assert from "node:assert/strict"
import test from "node:test"
import { readFile } from "node:fs/promises"
import { summarizeDashboardAffiliations } from "../lib/dashboard/affiliation-summary"

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
})
