import assert from "node:assert/strict"
import test from "node:test"
import { readFile } from "node:fs/promises"

test("le formulaire d'équipe du Club masque la discipline et sélectionne Basketball", async () => {
  const form = await readFile("components/dashboard/equipe-form-modal.tsx", "utf8")
  assert.doesNotMatch(form, /referenceField\("id_discipline", "Discipline"/)
  assert.match(form, /nextRefs\.DISCIPLINES/)
  assert.match(form, /includes\("basket"\)/)
  assert.match(form, /id_discipline: current\.id_discipline \|\| basketball\.id/)
})

test("la fiche Club n'affiche plus la tuile Compétitions en cours", async () => {
  const page = await readFile("app/dashboard/clubs/[id]/page.tsx", "utf8")
  assert.doesNotMatch(page, /label="Compétitions" value="En cours"/)
  assert.match(page, /xl:grid-cols-4/)
})
