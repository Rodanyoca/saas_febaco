import assert from "node:assert/strict"
import test from "node:test"
import { readFile } from "node:fs/promises"

test("la fiche Club explicite une catégorie d'athlète absente", async () => {
  const page = await readFile("app/dashboard/clubs/[id]/page.tsx", "utf8")
  assert.match(page, /athlete\.categorie\s*\|\|\s*"Non définie"/)
})
