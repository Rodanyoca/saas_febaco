import assert from "node:assert/strict"
import test from "node:test"
import { readFile } from "node:fs/promises"

test("la fiche Athlète calcule la catégorie depuis l'affiliation active", async () => {
  const page = await readFile("app/dashboard/athletes/[id]/page.tsx", "utf8")
  assert.match(page, /\/api\/athlete-affiliations\?/)
  assert.match(page, /const activeAffiliation = useMemo/)
  assert.match(page, /label: "Catégorie d’âge"/)
  assert.match(page, /activeAffiliation\?\.categorie \|\| "Non définie"/)
})

test("la fiche Athlète centralise les identifiants et le statut dans leur carte", async () => {
  const page = await readFile("app/dashboard/athletes/[id]/page.tsx", "utf8")

  assert.equal(page.match(/label: "ID Athlète"/g)?.length, 1)
  assert.equal(page.match(/label: "ID national"/g)?.length, 1)
  assert.equal(page.match(/label: "ID FIBA"/g)?.length, 1)
  assert.equal(page.match(/label: "Statut"/g)?.length, 1)
  assert.doesNotMatch(page, /<StatusBadge status=\{athlete\.statut\}/)
})
