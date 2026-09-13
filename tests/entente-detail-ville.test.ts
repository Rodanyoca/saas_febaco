import assert from "node:assert/strict"
import test from "node:test"
import { readFile } from "node:fs/promises"

test("la fiche d'une entente affiche le nom de la ville, pas son identifiant", async () => {
  const api = await readFile("app/api/ententes/[id]/route.ts", "utf8")
  const page = await readFile("app/dashboard/ententes/[id]/page.tsx", "utf8")

  assert.match(api, /getReferenceMap\("VILLES"\)/)
  assert.match(api, /ville:/)
  assert.match(page, /display\(entente\.ville\)/)
  assert.doesNotMatch(page, /value:display\(entente\.id_ville\)/)
})
