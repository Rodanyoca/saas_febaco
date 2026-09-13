import assert from "node:assert/strict"
import test from "node:test"
import { resolveAthleteAgeCategory } from "../lib/athlete-age-category"

const categories = [
  { id_categorie_age: "AGE001", nom_categorie_age: "SENIOR", age_min: "20", age_max: "" },
  { id_categorie_age: "AGE006", nom_categorie_age: "U20", age_min: "18", age_max: "19" },
  { id_categorie_age: "AGE007", nom_categorie_age: "U23", age_min: "20", age_max: "22" },
]
const asOf = new Date("2026-09-13T00:00:00Z")

test("un athlète sans naissance n'hérite pas de la catégorie Senior de son équipe", () => {
  assert.deepEqual(resolveAthleteAgeCategory("", categories, asOf), { id: "", label: "Non définie", age: undefined })
})

test("ATH20000 né le 08/02/2007 est U20 en 2026", () => {
  assert.equal(resolveAthleteAgeCategory("8/2/2007", categories, asOf).label, "U20")
})

test("une tranche bornée est prioritaire sur Senior lorsqu'elles se chevauchent", () => {
  assert.equal(resolveAthleteAgeCategory("2006-01-01", categories, asOf).label, "U23")
})
