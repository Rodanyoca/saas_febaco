import assert from "node:assert/strict";
import test from "node:test";
import { createCompetitionStructureItem, getCompetitionStructure } from "../lib/competition-structure";
import { CompetitionParticipationError } from "../lib/competition-participants";
import type { SheetRow } from "../lib/google-sheets";
import { readFile } from "node:fs/promises";

function fixture() {
  const sheets: Record<string, SheetRow[]> = {
    COMPETITIONS: [{ id_competition: "COMP-1" }, { id_competition: "COMP-2" }],
    COMPETITIONS_EPREUVES: [{ id_epreuve_competition: "EPR-1", id_competition: "COMP-1", nom_epreuve: "Senior masculin", statut: "ACTIF" }],
    COMPETITIONS_PHASES: [
      { id_phase_competition: "PH-1", id_competition: "COMP-1", id_type_phase: "TPH002", id_mode_phase: "MPH001", nom_phase: "Poules" },
      { id_phase_competition: "PH-2", id_competition: "COMP-2", id_type_phase: "TPH007", id_mode_phase: "MPH002", nom_phase: "Finale" },
    ],
    TYPES_PHASES: [{ id_type_phase: "TPH002", nom_type_phase: "PHASE_GROUPES" }, { id_type_phase: "TPH007", nom_type_phase: "FINALE" }],
    MODES_PHASES: [{ id_mode_phase: "MPH001", nom_mode_phase: "GROUPES" }, { id_mode_phase: "MPH002", nom_mode_phase: "ELIMINATION_DIRECTE" }],
    COMPETITIONS_PHASES_UNITES: [], COMPETITIONS_GROUPES_UNITES: [], COMPETITIONS_MATCHS: [],
    COMPETITIONS_GROUPES: [
      { id_groupe: "GR-1", id_phase_competition: "PH-1", nom_groupe: "Groupe A" },
      { id_groupe: "GR-2", id_phase_competition: "PH-2", nom_groupe: "Groupe B" },
    ],
  };
  let rows: Array<{ sheet: string; values: Record<string, string> }> = [];
  return {
    deps: {
      readRows: async ({ sheet }: { sheet: string }) => sheets[sheet] || [],
      appendRows: async (input: { rows: typeof rows }) => { rows = input.rows; },
    } as never,
    get rows() { return rows; },
  };
}

test("liste uniquement les phases et groupes de la compétition", async () => {
  const result = await getCompetitionStructure("COMP-1", fixture().deps);
  assert.deepEqual(result.phases.map((phase) => phase.id), ["PH-1"]);
  assert.deepEqual(result.groups.map((group) => group.id), ["GR-1"]);
});

test("relit toutes les épreuves sans cache et limite les plages Sheets", async () => {
  const setup = fixture();
  const baseDeps = setup.deps as unknown as { readRows: (params: { sheet: string; range?: string; fresh?: boolean }) => Promise<SheetRow[]>; appendRows: (input: unknown) => Promise<void> };
  const calls: Array<{ sheet: string; range?: string; fresh?: boolean }> = [];
  const deps = {
    ...baseDeps,
    readRows: async (params: { sheet: string; range?: string; fresh?: boolean }) => {
      calls.push(params);
      return baseDeps.readRows(params);
    },
  } as never;
  await getCompetitionStructure("COMP-1", deps);
  const eventsCall = calls.find((call) => call.sheet === "COMPETITIONS_EPREUVES");
  assert.deepEqual(eventsCall, { block: "competitions", sheet: "COMPETITIONS_EPREUVES", range: "A:H", fresh: true });
  assert.equal(calls.some((call) => call.range === "A:ZZ"), false);
});

test("crée les phases et les groupes par deux actions distinctes", async () => {
  const phaseSetup = fixture();
  await createCompetitionStructureItem("COMP-1", { kind: "phase", nom: "Phase de groupes", eventId: "EPR-1", typeId: "TPH002", modeId: "MPH001" }, phaseSetup.deps);
  assert.equal(phaseSetup.rows[0].sheet, "COMPETITIONS_PHASES");
  assert.equal(phaseSetup.rows[0].values.id_competition, "COMP-1");
  assert.equal(phaseSetup.rows[0].values.id_type_phase, "TPH002");
  assert.equal(phaseSetup.rows[0].values.id_mode_phase, "MPH001");

  const groupSetup = fixture();
  await createCompetitionStructureItem("COMP-1", { kind: "groupe", nom: "Groupe C", phaseId: "PH-1" }, groupSetup.deps);
  assert.equal(groupSetup.rows[0].sheet, "COMPETITIONS_GROUPES");
  assert.equal(groupSetup.rows[0].values.id_phase_competition, "PH-1");
});

test("refuse de créer un groupe dans une phase à élimination directe", async () => {
  const deps = { readRows: async ({ sheet }: { sheet: string }) => sheet === "COMPETITIONS_PHASES"
    ? [{ id_phase_competition: "PH-3", id_competition: "COMP-1", id_type_phase: "TPH007", id_mode_phase: "MPH002", nom_phase: "Finale" }]
    : ({
      COMPETITIONS: [{ id_competition: "COMP-1" }], COMPETITIONS_GROUPES: [],
      TYPES_PHASES: [{ id_type_phase: "TPH002", nom_type_phase: "PHASE_GROUPES" }, { id_type_phase: "TPH007", nom_type_phase: "FINALE" }], MODES_PHASES: [{ id_mode_phase: "MPH002", nom_mode_phase: "ELIMINATION_DIRECTE" }],
    } as Record<string, SheetRow[]>)[sheet] || [],
    appendRows: async () => undefined } as never;
  await assert.rejects(
    createCompetitionStructureItem("COMP-1", { kind: "groupe", nom: "Groupe interdit", phaseId: "PH-3" }, deps),
    (error: unknown) => error instanceof CompetitionParticipationError && error.code === "PHASE_SANS_GROUPES",
  );
});

test("refuse de rattacher un groupe à la phase d’une autre compétition", async () => {
  await assert.rejects(
    createCompetitionStructureItem("COMP-1", { kind: "groupe", nom: "Groupe X", phaseId: "PH-2" }, fixture().deps),
    (error: unknown) => error instanceof CompetitionParticipationError && error.code === "PHASE_INVALIDE",
  );
});

test("le POST structure ne transforme pas une écriture réussie en 503 par une relecture Sheets", async () => {
  const route = await readFile("app/api/competitions/[id]/structure/route.ts", "utf8");
  const panel = await readFile("components/dashboard/competition-structure-panel.tsx", "utf8");

  assert.doesNotMatch(route, /created, \.\.\.\(await getCompetitionStructure\(competitionId\)\)/);
  assert.match(panel, /setGroups\(current=>\[\.\.\.current,/);
});
