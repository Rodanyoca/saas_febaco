import assert from "node:assert/strict"
import test from "node:test"
import { readFile } from "node:fs/promises"

test("la fiche Club affiche la ville et calcule la version depuis id_sexe", async () => {
  const api = await readFile("app/api/clubs/route.ts", "utf8")
  const page = await readFile("app/dashboard/clubs/[id]/page.tsx", "utf8")

  assert.match(api, /getReferenceMap\("SEXES"\)/)
  assert.match(api, /const sexeId = pickFirst\(row, \["id_sexe"\]\)/)
  assert.match(api, /version: sexes\.get\(sexeId\)/)
  assert.doesNotMatch(api, /pickFirst\(row, \["version"\]\)/)
  assert.match(page, /label: "Ville", value: club\.ville/)
  assert.match(page, /label: "Version", value: club\.version/)
})
