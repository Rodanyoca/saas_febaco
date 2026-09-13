import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

test("la fiche Ligue compte les athlètes depuis leurs affiliations aux équipes liées", () => {
  const page = fs.readFileSync("app/dashboard/ligues/[id]/page.tsx", "utf8")
  const route = fs.readFileSync("app/api/athlete-affiliations/route.ts", "utf8")

  assert.match(page, /fetch\(`\/api\/athlete-affiliations\?\$\{query\}`/)
  assert.match(route, /ligueId: params\.get\("ligueId"\)/)
  assert.doesNotMatch(page, /equipeIds: equipeIdsKey/)
  assert.match(page, /value=\{athletePagination\.total\}/)
})
