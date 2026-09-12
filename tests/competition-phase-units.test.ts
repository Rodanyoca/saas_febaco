import assert from "node:assert/strict";
import test from "node:test";
import { mergeCompetitionPhaseUnits } from "../lib/competition-phase-units";
import { isCompetitionGroupPhase, resolvedReferenceLabel } from "../lib/competition-phase";

test("fusionne la source canonique et l’historique par identifiants avec priorité canonique", () => {
  const canonical = [{ id_phase_unite: "PHU1", id_phase_competition: "PH1", id_groupe: "G1", id_unite_competition: "U1", statut: "ACTIF", observations: "canonique" }];
  const historical = [{ id_affectation_groupe: "AFG1", id_groupe: "G1", id_unite_competition: "U1", statut: "ACTIF" }, { id_affectation_groupe: "AFG2", id_groupe: "G1", id_unite_competition: "U2", statut: "ACTIF" }];
  const merged = mergeCompetitionPhaseUnits(canonical, historical, [{ id_groupe: "G1", id_phase_competition: "PH1" }]);
  assert.equal(merged.length, 2);
  assert.equal(merged.find((row) => row.id_unite_competition === "U1")?.id_phase_unite, "PHU1");
  assert.equal(merged.find((row) => row.id_unite_competition === "U2")?.id_phase_competition, "PH1");
});

test("conserve un mode inconnu avec un libellé explicite", () => {
  assert.equal(resolvedReferenceLabel("MPH404", [], "id_mode_phase", "nom_mode_phase", "Mode non référencé"), "Mode non référencé");
});

test("résout les modes officiels sans les déduire du type ou du nom", () => {
  const modes = [{ id_mode_phase: "MPH001", nom_mode_phase: "GROUPES" }, { id_mode_phase: "MPH002", nom_mode_phase: "ELIMINATION_DIRECTE" }];
  assert.equal(resolvedReferenceLabel("MPH001", modes, "id_mode_phase", "nom_mode_phase", "inconnu"), "GROUPES");
  assert.equal(resolvedReferenceLabel("MPH002", modes, "id_mode_phase", "nom_mode_phase", "inconnu"), "ELIMINATION_DIRECTE");
  assert.equal(isCompetitionGroupPhase({ id_type_phase: "TPH002", nom_phase: "PHASE DE GROUPES" }), false);
});
