import assert from "node:assert/strict"
import test from "node:test"
import { readFile } from "node:fs/promises"
import { validateEquipeReferenceValues } from "../components/dashboard/equipe-form-modal"

test("le formulaire d'équipe ne demande et n'envoie aucune discipline", async () => {
  const form = await readFile("components/dashboard/equipe-form-modal.tsx", "utf8")
  assert.doesNotMatch(form, /id_discipline/)
  assert.doesNotMatch(form, /DISCIPLINES/)
})

test("le formulaire d'équipe ne peut soumettre que des identifiants issus des référentiels", async () => {
  const form = await readFile("components/dashboard/equipe-form-modal.tsx", "utf8")
  assert.match(form, /const \[referencesLoading, setReferencesLoading\] = useState\(false\)/)
  assert.match(form, /validateEquipeReferenceValues\(values, refs\)/)
  assert.doesNotMatch(form, /Discipline Basketball introuvable/)
})

test("refuse une valeur ajoutée par le formulaire mais absente des référentiels", () => {
  const refs = {
    CATEGORIES_AGE: [{ id: "AGE001", label: "Senior" }],
    SEXES: [{ id: "SEX001", label: "Masculin" }],
  }
  assert.deepEqual(validateEquipeReferenceValues({
    id_categorie_age: "Senior",
    id_sexe: "MASCULIN",
  }, refs), {
    id_categorie_age: "Sélectionnez une valeur du référentiel.",
    id_sexe: "Sélectionnez une valeur du référentiel.",
  })
  assert.deepEqual(validateEquipeReferenceValues({
    id_categorie_age: "AGE001",
    id_sexe: "SEX001",
  }, refs), {})
})

test("la fiche Club n'affiche plus la tuile Compétitions en cours", async () => {
  const page = await readFile("app/dashboard/clubs/[id]/page.tsx", "utf8")
  assert.doesNotMatch(page, /label="Compétitions" value="En cours"/)
  assert.match(page, /xl:grid-cols-4/)
})

test("la liste des équipes du club n'affiche aucune colonne Saison", async () => {
  const page = await readFile("app/dashboard/clubs/[id]/page.tsx", "utf8")
  const columns = page.slice(page.indexOf("const equipeColumns"), page.indexOf("const staffColumns"))
  assert.doesNotMatch(columns, /saison|Saison/)
})
