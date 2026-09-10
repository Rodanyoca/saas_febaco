import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

test("la fiche entente charge ses données depuis une seule route métier", async () => {
  const source = await readFile("app/dashboard/ententes/[id]/page.tsx", "utf8")
  const routes = new Set(source.match(/\/api\/[a-z-]+/g) ?? [])

  assert.deepEqual([...routes], ["/api/ententes"])
})
