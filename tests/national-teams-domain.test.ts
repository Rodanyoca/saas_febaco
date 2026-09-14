import assert from "node:assert/strict"
import test from "node:test"
import { assertCampaignTransition, generateNationalId, normalizeEngagementRow, resolveNationalYear } from "../lib/national-teams-domain"

test("les identifiants nationaux suivent les formats métier et la séquence réelle", () => {
  assert.equal(generateNationalId("team", "", ["BKB-EN-001", "BKB-EN-009"]), "BKB-EN-010")
  assert.equal(generateNationalId("season", "2026", ["BKB-ENS-2026-004"]), "BKB-ENS-2026-005")
  assert.equal(generateNationalId("campaign", "2026", ["BKB-CEN-2026-001-009"]), "BKB-CEN-2026-001-010")
})

test("une campagne ne peut suivre que les transitions autorisées", () => {
  assert.doesNotThrow(() => assertCampaignTransition("SCA001", "SCA002"))
  assert.throws(() => assertCampaignTransition("SCA003", "SCA002"), /Transition de campagne interdite/)
})

test("l'ancien en-tête statut d'un engagement est normalisé à la couture Sheets", () => {
  assert.equal(normalizeEngagementRow({ statut: "SEG002" }).id_statut_engagement, "SEG002")
  assert.equal(normalizeEngagementRow({ statut: "SEG001", id_statut_engagement: "SEG004" }).id_statut_engagement, "SEG004")
})

test("une équipe permanente sans saison ni date utilise l'année courante sans planter", () => {
  assert.equal(resolveNationalYear({}, "2026"), "2026")
  assert.equal(resolveNationalYear({ id_saison: "SAI-2027" }, "2026"), "2027")
  assert.equal(resolveNationalYear({ date_debut: "2028-03-10" }, "2026"), "2028")
})
