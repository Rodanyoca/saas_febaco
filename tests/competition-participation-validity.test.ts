import assert from "node:assert/strict";
import test from "node:test";
import { calculateCompetitionParticipationValidity } from "../lib/competition-participation-validity";

const competition = { id_competition: "C1", id_saison: "SAI2024", date_debut: "2024-09-01", date_fin: "2024-09-10" };

test("valide la licence saisonnière d'un athlète, même historiquement expirée", () => {
  const result = calculateCompetitionParticipationValidity({ competition, intervenant: { id_type_acteur: "TAC001", id_acteur: "ATH1" }, athleteLicenses: [{ id_licence: "L1", id_athlete: "ATH1", id_saison: "SAI2024", numero_licence: "3801", date_delivrance: "2024-08-01", id_statut_licence: "STL002" }], actorLicenses: [] });
  assert.deepEqual({ status: result.statutParticipation, number: result.numeroLicence, source: result.idLicenceSource }, { status: "VALIDE", number: "3801", source: "L1" });
});

test("n'utilise jamais une licence d'une autre saison pour un athlète", () => {
  const result = calculateCompetitionParticipationValidity({ competition, intervenant: { id_type_acteur: "TAC001", id_acteur: "ATH1" }, athleteLicenses: [{ id_licence: "L2", id_athlete: "ATH1", id_saison: "SAI2025", numero_licence: "999" }], actorLicenses: [] });
  assert.equal(result.statutParticipation, "NON_VALIDE");
  assert.match(result.raisonStatutParticipation, /saison/);
});

test("rend la saison absente indéterminée pour un athlète", () => {
  const result = calculateCompetitionParticipationValidity({ competition: { ...competition, id_saison: "" }, intervenant: { id_type_acteur: "TAC001", id_acteur: "ATH1" }, athleteLicenses: [], actorLicenses: [] });
  assert.equal(result.statutParticipation, "INDETERMINE");
});

test("sélectionne déterministement la licence admissible la plus récente", () => {
  const result = calculateCompetitionParticipationValidity({ competition, intervenant: { id_type_acteur: "TAC001", id_acteur: "ATH1" }, athleteLicenses: [
    { id_licence: "OLD", id_athlete: "ATH1", id_saison: "SAI2024", numero_licence: "1", date_delivrance: "2024-01-01", id_statut_licence: "STL001" },
    { id_licence: "NEW", id_athlete: "ATH1", id_saison: "SAI2024", numero_licence: "2", date_delivrance: "2024-08-01", id_statut_licence: "STL001" },
  ], actorLicenses: [] });
  assert.equal(result.idLicenceSource, "NEW");
  assert.equal(result.qualiteDonnees, "PLUSIEURS_LICENCES_CONCURRENTES");
});

test("valide une licence d'acteur couvrant exactement toute la compétition", () => {
  const result = calculateCompetitionParticipationValidity({ competition, intervenant: { id_type_acteur: "TAC004", id_acteur: "ARB1" }, athleteLicenses: [], actorLicenses: [{ id_licence: "A1", id_type_acteur: "TAC004", id_acteur: "ARB1", numero_licence: "3802", date_debut_validite: "2024-09-01", date_fin_validite: "2024-09-10", id_statut_licence: "STL002" }] });
  assert.equal(result.statutParticipation, "VALIDE");
  assert.equal(result.numeroLicence, "3802");
});

test("une licence d'acteur peut couvrir plusieurs saisons et rester valide", () => {
  const result = calculateCompetitionParticipationValidity({ competition, intervenant: { id_type_acteur: "TAC002", id_acteur: "COA1" }, athleteLicenses: [], actorLicenses: [{ id_licence: "A1", id_type_acteur: "TAC002", id_acteur: "COA1", date_debut_validite: "2022-01-01", date_fin_validite: "2026-12-31", id_statut_licence: "STL001" }] });
  assert.equal(result.statutParticipation, "VALIDE");
});

test("choisit la couverture la plus récente et signale plusieurs licences concurrentes", () => {
  const result = calculateCompetitionParticipationValidity({ competition, intervenant: { id_type_acteur: "TAC004", id_acteur: "ARB1" }, athleteLicenses: [], actorLicenses: [
    { id_licence: "A1", id_type_acteur: "TAC004", id_acteur: "ARB1", date_debut_validite: "2024-01-01", date_fin_validite: "2025-01-01", id_statut_licence: "STL001" },
    { id_licence: "A2", id_type_acteur: "TAC004", id_acteur: "ARB1", date_debut_validite: "2024-08-01", date_fin_validite: "2025-08-01", id_statut_licence: "STL001" },
  ] });
  assert.equal(result.idLicenceSource, "A2");
  assert.equal(result.qualiteDonnees, "PLUSIEURS_LICENCES_CONCURRENTES");
});

test("une licence sans numéro garde sa validité avec un signal de qualité", () => {
  const result = calculateCompetitionParticipationValidity({ competition, intervenant: { id_type_acteur: "TAC005", id_acteur: "MED1" }, athleteLicenses: [], actorLicenses: [{ id_licence: "A1", id_type_acteur: "TAC005", id_acteur: "MED1", date_debut_validite: "2024-01-01", date_fin_validite: "2025-01-01", id_statut_licence: "STL001" }] });
  assert.equal(result.statutParticipation, "VALIDE");
  assert.equal(result.qualiteDonnees, "NUMERO_MANQUANT");
});

test("refuse une licence qui expire un jour avant la fin", () => {
  const result = calculateCompetitionParticipationValidity({ competition, intervenant: { id_type_acteur: "TAC005", id_acteur: "MED1" }, athleteLicenses: [], actorLicenses: [{ id_licence: "A1", id_type_acteur: "TAC005", id_acteur: "MED1", date_debut_validite: "2024-01-01", date_fin_validite: "2024-09-09", id_statut_licence: "STL001" }] });
  assert.equal(result.statutParticipation, "NON_VALIDE");
  assert.match(result.raisonStatutParticipation, /expire avant/);
});

test("une licence suspendue reste non valide même si elle couvre les dates", () => {
  const result = calculateCompetitionParticipationValidity({ competition, intervenant: { id_type_acteur: "TAC003", id_acteur: "OFF1" }, athleteLicenses: [], actorLicenses: [{ id_licence: "A1", id_type_acteur: "TAC003", id_acteur: "OFF1", date_debut_validite: "2020-01-01", date_fin_validite: "2030-01-01", id_statut_licence: "STL003" }] });
  assert.equal(result.statutParticipation, "NON_VALIDE");
  assert.equal(result.raisonStatutParticipation, "Licence suspendue");
});

test("une compétition sans dates rend un acteur licencié indéterminé", () => {
  const result = calculateCompetitionParticipationValidity({ competition: { ...competition, date_fin: "" }, intervenant: { id_type_acteur: "TAC002", id_acteur: "COA1" }, athleteLicenses: [], actorLicenses: [] });
  assert.equal(result.statutParticipation, "INDETERMINE");
});

test("AUTRE est non applicable et ne consulte aucune licence", () => {
  const result = calculateCompetitionParticipationValidity({ competition, intervenant: { id_type_acteur: "TAC099", id_acteur: "AUT1" }, athleteLicenses: [{ id_athlete: "AUT1" }], actorLicenses: [{ id_type_acteur: "TAC099", id_acteur: "AUT1" }] });
  assert.equal(result.statutParticipation, "NON_APPLICABLE");
  assert.equal(result.numeroLicence, null);
});
