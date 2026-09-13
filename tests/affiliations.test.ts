import test from "node:test"
import assert from "node:assert/strict"
import { AffiliationError, affiliationConfig, generateAffiliationId, listAthleteAffiliations, mutateAffiliation, validateAffiliationInput, type AffiliationKind } from "../lib/affiliations"
import type { SheetRow } from "../lib/google-sheets"

function fakeDeps(kind: AffiliationKind, initial: SheetRow[] = []) {
  let rows = [...initial]
  let writes = 0
  return {
    deps: {
      readRows: async ({ block, sheet }: { block: string; sheet: string }) => {
        if (block === "affiliations") return rows
        if (sheet === "STATUTS_AFFILIATION") return [{ id_statut_affiliation: "SAF001", nom_statut_affiliation: "ACTIF" }]
        if (sheet === "FONCTIONS") return [{ id_fonction: "FON001", nom_fonction: "PRESIDENT" }]
        if (sheet === "CLUBS") return [{ id_club: "CLU-001", nom_club: "Club Test" }]
        if (sheet === "EQUIPES") return [{ id_equipe: "EQ-001", nom_equipe: "Équipe Test", id_club: "CLU-001", id_categorie_age: "AGE001" }]
        if (sheet === "CATEGORIES_AGE") return [{ id_categorie_age: "AGE001", nom_categorie_age: "Senior" }]
        if (sheet === "LIGUES") return [{ id_ligue: "LIG-001", nom_ligue: "Ligue Test" }]
        if (sheet === "ENTENTES") return [{ id_entente: "ENT-001", nom_entente: "Entente Test" }]
        return [{ [affiliationConfig[kind].actor]: "ACT-001" }]
      },
      writeRow: async ({ id, values, mode }: { id: string; values: SheetRow; mode: "create" | "update" }) => {
        writes++
        const key = affiliationConfig[kind].id
        const next = { ...values, [key]: id }
        rows = mode === "create" ? [...rows, next] : rows.map((row) => row[key] === id ? next : row)
        return next
      },
    } as never,
    get writes() { return writes },
  }
}

test("génère les identifiants d'affiliation attendus", () => {
  assert.equal(generateAffiliationId("athlete", [{ id_affiliation_athlete: "AFA-000001" }, { id_affiliation_athlete: "AFA-000003" }]), "AFA-000004")
  assert.equal(generateAffiliationId("coach", []), "AFC-000001")
  assert.equal(generateAffiliationId("medecin", []), "AFM-000001")
  assert.equal(generateAffiliationId("officiel", []), "AFO-000001")
  assert.equal(generateAffiliationId("autre", []), "AFAUT-000001")
})

test("valide la période et les champs propres à chaque type", () => {
  assert.ok(validateAffiliationInput("athlete", { id_equipe: "EQ-001", date_debut: "2026-02", id_statut_affiliation: "SAF001" }).errors.date_debut)
  assert.ok(validateAffiliationInput("autre", { date_debut: "2026-01-01", id_statut_affiliation: "SAF001" }).errors.entite)
  assert.ok(validateAffiliationInput("officiel", { id_fonction: "FON001", id_type_entite: "PROVINCE", id_entite: "P1", date_debut: "2026-01-01", id_statut_affiliation: "SAF001" }).errors.id_type_entite)
})

test("rend une création répétée idempotente", async () => {
  const fake = fakeDeps("athlete")
  const payload = { id_equipe: "EQ-001", date_debut: "2026-01-01", date_fin: "", id_statut_affiliation: "SAF001", observation: "Test" }
  const first = await mutateAffiliation("athlete", "create", "ACT-001", payload, undefined, fake.deps)
  const second = await mutateAffiliation("athlete", "create", "ACT-001", payload, undefined, fake.deps)
  assert.ok(first && second)
  assert.equal(first.id, second.id)
  assert.equal(fake.writes, 1)
})

test("interdit de réaffecter une affiliation à un autre acteur", async () => {
  const fake = fakeDeps("athlete", [{ id_affiliation_athlete: "AFA-000001", id_athlete: "ACT-001", id_equipe: "EQ-001", date_debut: "2026-01-01", id_statut_affiliation: "SAF001" }])
  await assert.rejects(
    () => mutateAffiliation("athlete", "update", "ACT-002", {}, "AFA-000001", fake.deps),
    (error: unknown) => error instanceof AffiliationError && error.code === "INTROUVABLE",
  )
})

test("ne définit aucune affiliation pour les arbitres", () => {
  assert.equal(Object.prototype.hasOwnProperty.call(affiliationConfig, "arbitre"), false)
})

test("résout le club exclusivement via l'équipe", async () => {
  const fake = fakeDeps("athlete", [{ id_affiliation_athlete: "AFA-000001", id_athlete: "ACT-001", id_equipe: "EQ-001", date_debut: "2026-01-01", id_statut_affiliation: "SAF001" }])
  const affiliations = await listAthleteAffiliations({ clubId: "CLU-001" }, fake.deps)
  assert.equal(affiliations.length, 1)
  assert.equal(affiliations[0].equipe, "Équipe Test")
  assert.equal(affiliations[0].club, "Club Test")
  assert.equal(affiliations[0].clubId, "CLU-001")
  assert.equal(affiliations[0].categorie, "Senior")
})

test("signale une équipe orpheline sans fabriquer de club", async () => {
  const fake = fakeDeps("athlete", [{ id_affiliation_athlete: "AFA-000001", id_athlete: "ACT-001", id_equipe: "INCONNUE", date_debut: "2026-01-01", id_statut_affiliation: "SAF001" }])
  const affiliations = await listAthleteAffiliations({}, fake.deps)
  assert.equal(affiliations[0].clubId, "")
  assert.match(affiliations[0].anomalie, /Équipe introuvable/)
})
