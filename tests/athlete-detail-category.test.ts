import assert from "node:assert/strict"
import test from "node:test"
import { readFile } from "node:fs/promises"

test("la fiche Athlète affiche la catégorie calculée depuis sa naissance", async () => {
  const page = await readFile("app/dashboard/athletes/[id]/page.tsx", "utf8")
  const route = await readFile("app/api/athletes/route.ts", "utf8")
  assert.match(page, /label: "Catégorie d’âge"/)
  assert.match(page, /athlete\.categorie \|\| "Non définie"/)
  assert.match(route, /resolveAthleteAgeCategory/)
  assert.doesNotMatch(page, /\/api\/athlete-affiliations\?/)
})

test("la fiche Athlète centralise les identifiants et le statut dans leur carte", async () => {
  const page = await readFile("app/dashboard/athletes/[id]/page.tsx", "utf8")

  assert.equal(page.match(/label: "ID Athlète"/g)?.length, 1)
  assert.equal(page.match(/label: "ID national"/g)?.length, 1)
  assert.equal(page.match(/label: "ID FIBA"/g)?.length, 1)
  assert.equal(page.match(/label: "Statut"/g)?.length, 1)
  assert.doesNotMatch(page, /<StatusBadge status=\{athlete\.statut\}/)
})
