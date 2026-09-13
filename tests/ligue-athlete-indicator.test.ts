import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"

test("la fiche Ligue compte les athlètes depuis leurs affiliations aux équipes liées", () => {
  const page = fs.readFileSync("app/dashboard/ligues/[id]/page.tsx", "utf8")
  const route = fs.readFileSync("app/api/athlete-affiliations/route.ts", "utf8")

  assert.match(page, /fetch\(`\/api\/athlete-affiliations\?\$\{query\}`/)
  assert.match(route, /params\.get\("equipeIds"\)/)
  assert.match(route, /equipeIds\.has\(String\(item\.equipeId/)
  assert.match(page, /value=\{athletePagination\.total\}/)
})
