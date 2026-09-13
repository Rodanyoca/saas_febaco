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
