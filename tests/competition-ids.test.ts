import assert from "node:assert/strict";
import test from "node:test";
import { competitionEntityId } from "../lib/competition-ids";

test("génère des identifiants métier contextualisés par compétition", () => {
  assert.equal(competitionEntityId("phase", "BKB-COMP-2019-001", [], "id_phase_competition"), "BKB-PHA-2019-001-001");
  assert.equal(competitionEntityId("match", "BKB-COMP-2019-001", [], "id_match"), "BKB-MAT-2019-001-001");
  assert.equal(competitionEntityId("resultat", "BKB-COMP-2019-001", [], "id_resultat"), "BKB-RES-2019-001-001");
});

test("ignore les anciens identifiants numériques et poursuit sa propre séquence", () => {
  const rows = [{ id_groupe: "1" }, { id_groupe: "2" }, { id_groupe: "BKB-GRP-2019-001-004" }];
  assert.equal(competitionEntityId("groupe", "BKB-COMP-2019-001", rows, "id_groupe"), "BKB-GRP-2019-001-005");
});

test("sépare les séquences de deux compétitions", () => {
  const rows = [{ id_match: "BKB-MAT-2019-001-003" }];
  assert.equal(competitionEntityId("match", "BKB-COMP-2026-002", rows, "id_match"), "BKB-MAT-2026-002-001");
});

test("génère les affectations PHU sans tenir compte des anciens AFG", () => {
  const rows = [{ id_phase_unite: "BKB-AFG-2026-002-099" }, { id_phase_unite: "BKB-PHU-2026-002-002" }];
  assert.equal(competitionEntityId("phaseUnite", "BKB-COMP-2026-002", rows, "id_phase_unite"), "BKB-PHU-2026-002-003");
  assert.equal(competitionEntityId("phaseUnite", "BKB-COMP-2026-002", [], "id_phase_unite"), "BKB-PHU-2026-002-001");
});
