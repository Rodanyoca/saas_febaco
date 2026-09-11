import test from "node:test"
import assert from "node:assert/strict"
import { generateTerritorialId, validateTerritorialInput } from "../lib/territorial"
import { editableValue, normalizeTerritorialRow } from "../components/dashboard/territorial-manager"
import { saveAndReloadTerritorialItems, sortTerritorialItems } from "../lib/territorial-client"

test("génère l'identifiant suivant d'une ligue", () => {
  assert.equal(generateTerritorialId("ligues", [{ id_ligue: "01" }, { id_ligue: "09" }], {}), "10")
})

test("génère une entente dans sa ligue", () => {
  assert.equal(generateTerritorialId("ententes", [{ id_entente: "0101" }, { id_entente: "0102" }], { id_ligue: "01" }), "0103")
})

test("génère le prochain identifiant d'un club", () => {
  assert.equal(generateTerritorialId("clubs", [{ id_club: "1" }, { id_club: "7" }], {}), "8")
})

test("génère une équipe depuis son club", () => {
  assert.equal(generateTerritorialId("equipes", [{ id_equipe: "101" }, { id_equipe: "102" }], { id_club: "1" }), "103")
})

test("valide une création de ligue", () => {
  assert.deepEqual(validateTerritorialInput("ligues", { nom_ligue: "Kinshasa", id_province: "PROV001", statut: "ACTIF" }).errors, {})
})

test("ne recopie pas les tirets d'affichage dans le formulaire", () => {
  assert.equal(editableValue("-"), "")
  assert.equal(editableValue("Non renseigné"), "")
  assert.equal(editableValue("contact@febaco.cd"), "contact@febaco.cd")
})

test("refuse une date de reconnaissance antérieure", () => {
  const { errors } = validateTerritorialInput("ligues", { nom_ligue: "Kinshasa", id_province: "PROV001", statut: "ACTIF", date_creation: "2026-02-01", date_reconnaissance: "2026-01-01" })
  assert.ok(errors.date_reconnaissance)
})

test("refuse une équipe sans parent ni référentiels", () => {
  const { errors } = validateTerritorialInput("equipes", { nom_equipe: "A", statut: "ACTIF" })
  assert.deepEqual(Object.keys(errors).sort(), ["id_categorie_age", "id_club", "id_discipline", "id_sexe"].sort())
})

test("résout immédiatement la province d'une ligue créée", () => {
  const ligue = normalizeTerritorialRow(
    { id_ligue: "27", nom_ligue: "Ligue test", id_province: "PROV001", statut: "ACTIF" },
    "ligues",
    { PROVINCES: [{ id: "PROV001", label: "Kinshasa" }] },
  )

  assert.equal(ligue.province, "Kinshasa")
})

test("résout immédiatement la ligue d'une entente créée", () => {
  const entente = normalizeTerritorialRow(
    { id_entente: "0101", nom_entente: "Entente test", id_ligue: "01", statut: "ACTIF" },
    "ententes",
    {},
    { ligues: [{ id: "01", label: "Ligue de Kinshasa" }] },
  )

  assert.equal(entente.ligue, "Ligue de Kinshasa")
})

test("refuse un statut et un e-mail invalides", () => {
  const { errors } = validateTerritorialInput("clubs", { nom_club: "A", id_entente: "0101", id_categorie_club: "CCL001", statut: "ARCHIVE", email: "incorrect" })
  assert.ok(errors.statut)
  assert.ok(errors.email)
})

test("classe les clubs par nom selon l'ordre alphabétique français", () => {
  const clubs = sortTerritorialItems([
    { id: "2", nom: "Étoile", statut: "ACTIF" },
    { id: "1", nom: "AS Dragons", statut: "ACTIF" },
    { id: "3", nom: "Basket Académie", statut: "ACTIF" },
  ])

  assert.deepEqual(clubs.map((club) => club.nom), ["AS Dragons", "Basket Académie", "Étoile"])
})

test("relit la liste enrichie immédiatement après la création d'un club", async () => {
  const calls: string[] = []
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input)
    calls.push(`${init?.method || "GET"} ${url}`)
    if (init?.method === "POST") {
      return Response.json({ entity: { id_club: "8", nom_club: "Zèbres", id_entente: "0101", statut: "ACTIF" } }, { status: 201 })
    }
    return Response.json({ clubs: [
      { id: "8", nom: "Zèbres", entente: "EKK", ligue: "LIKIN", categorie: "Senior", statut: "ACTIF" },
      { id: "1", nom: "Aigles", entente: "EKK", ligue: "LIKIN", categorie: "Senior", statut: "ACTIF" },
    ] })
  }

  const items = await saveAndReloadTerritorialItems(fetcher, "/api/clubs", "clubs", "POST", { nom_club: "Zèbres" })

  assert.deepEqual(calls, ["POST /api/clubs", "GET /api/clubs"])
  assert.deepEqual(items.map((club) => club.nom), ["Aigles", "Zèbres"])
  assert.equal(items[1].entente, "EKK")
  assert.equal(items[1].ligue, "LIKIN")
  assert.equal(items[1].categorie, "Senior")
})
