import assert from "node:assert/strict"
import test from "node:test"
import { readFile } from "node:fs/promises"
import { validateTerritorialInput } from "../lib/territorial"

test("les informations chronologiques de la ligue sont facultatives", () => {
  const result = validateTerritorialInput("ligues", {
    nom_ligue: "Ligue test",
    id_province: "PROV001",
    statut: "ACTIF",
  })
  assert.deepEqual(result.errors, {})
})

test("l'année de création doit contenir quatre chiffres lorsqu'elle est fournie", () => {
  const result = validateTerritorialInput("ligues", {
    nom_ligue: "Ligue test",
    id_province: "PROV001",
    statut: "ACTIF",
    année_creation: "20A6",
  })
  assert.equal(result.errors.année_creation, "Année invalide.")
})

test("le formulaire, l'API et la fiche utilisent les en-têtes réels de LIGUES", async () => {
  const manager = await readFile("components/dashboard/territorial-manager.tsx", "utf8")
  const api = await readFile("app/api/ligues/route.ts", "utf8")
  const detail = await readFile("app/dashboard/ligues/[id]/page.tsx", "utf8")
  assert.match(manager, /key: "année_creation"/)
  assert.match(manager, /key: "date_affiliation_ligue"/)
  assert.match(api, /anneeCreation/)
  assert.match(api, /dateAffiliation/)
  assert.match(detail, /Année de création/)
  assert.match(detail, /Date d’affiliation/)
})
