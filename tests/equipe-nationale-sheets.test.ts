import assert from "node:assert/strict"
import test from "node:test"
import { readFile } from "node:fs/promises"

test("le lecteur des équipes nationales utilise uniquement les onglets canoniques", async () => {
  const source = await readFile("lib/equipe-nationale-data.ts", "utf8")
  for (const sheet of ["EQUIPES_NATIONALES", "EQUIPES_NATIONALES_SAISONS", "CAMPAGNES_EQUIPES_NATIONALES", "SELECTIONS_ATHLETES", "ENGAGEMENTS_EQUIPE_NATIONALE"]) assert.match(source, new RegExp(`rows\\(\"${sheet}\"\\)`))
  assert.doesNotMatch(source, /rows\("EQUIPE_NATIONALE"\)|rows\("SELECTION"\)|rows\("COMPETITIONS_EQUIPE_NATIONALE"\)|rows\("EQUIPE_NATIONALE_RESULTATS"\)/)
})

test("l'absence de feuille de résultats renvoie une liste vide", async () => {
  const source = await readFile("lib/equipe-nationale-data.ts", "utf8")
  assert.match(source, /getResultatsEquipeNationale[\s\S]*?return \[\]/)
})
