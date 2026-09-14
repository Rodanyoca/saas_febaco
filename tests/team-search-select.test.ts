import assert from "node:assert/strict"
import test from "node:test"
import { readFile } from "node:fs/promises"

test("les formulaires volumineux recherchent les équipes sans monter toute la liste", async () => {
  const [affiliations, participants, matchs, searchSelect] = await Promise.all([
    readFile("components/dashboard/affiliations-panel.tsx", "utf8"),
    readFile("components/dashboard/competition-participants-panel.tsx", "utf8"),
    readFile("components/dashboard/competition-play-panel.tsx", "utf8"),
    readFile("components/ui/search-select.tsx", "utf8"),
  ])
  assert.match(affiliations, /<SearchSelect value=\{values\.id_equipe\}/)
  assert.match(participants, /<SearchSelect value=\{selected\[club\.id\]\}/)
  assert.match(matchs, /<SearchSelect value=\{unitA\}/)
  assert.match(matchs, /<SearchSelect value=\{unitB\}/)
  assert.match(searchSelect, /\.slice\(0, 40\)/)
})
