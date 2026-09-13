import assert from "node:assert/strict";
import test from "node:test";
import { calculateStandings, createCompetitionMatch, createCompetitionPhaseUnit, createCompetitionQualifications, createCompetitionResult, getCompetitionPlay } from "../lib/competition-play";
import { CompetitionParticipationError } from "../lib/competition-participants";
import { competitionQualificationDestinations, competitionQualificationEligibleUnitIds, createInitialCompetitionMatchForm, createInitialCompetitionScores, pendingCompetitionMatches } from "../lib/competition-play-view";
import type { SheetRow } from "../lib/google-sheets";

function fixture(overrides: Record<string, SheetRow[]> = {}) {
  const sheets: Record<string, SheetRow[]> = {
    COMPETITIONS: [{ id_competition: "COMP-1", nom_competition: "Coupe" }],
    COMPETITIONS_PHASES: [{ id_phase_competition: "PH-1", id_competition: "COMP-1", id_type_phase: "TPH002", id_mode_phase: "MPH001", nom_phase: "Poules" }],
    COMPETITIONS_GROUPES: [{ id_groupe: "GR-1", id_phase_competition: "PH-1", nom_groupe: "Groupe A" }],
    COMPETITIONS_GROUPES_UNITES: [{ id_affectation_groupe: "A1", id_groupe: "GR-1", id_unite_competition: "U1", statut: "ACTIF" }, { id_affectation_groupe: "A2", id_groupe: "GR-1", id_unite_competition: "U2", statut: "ACTIF" }],
    COMPETITIONS_UNITES: [{ id_unite_competition: "U1", id_competition: "COMP-1", id_equipe: "E1", statut: "ACTIF" }, { id_unite_competition: "U2", id_competition: "COMP-1", id_equipe: "E2", statut: "ACTIF" }],
    COMPETITIONS_PHASES_UNITES: [], COMPETITIONS_MATCHS: [], COMPETITIONS_RESULTATS: [], COMPETITIONS_CLASSEMENT: [],
    STATUTS_RESULTATS: [{ id_statut_resultat: "STR001", nom_statut_resultat: "JOUE" }, { id_statut_resultat: "STR005", nom_statut_resultat: "ANNULE" }],
    TYPES_AFFECTATIONS_PHASES: [{ id_type_affectation_phase: "TAP001", nom_type_affectation_phase: "ENGAGEMENT_INITIAL" }, { id_type_affectation_phase: "TAP002", nom_type_affectation_phase: "QUALIFICATION" }],
    TYPES_PHASES: [{ id_type_phase: "TPH002", nom_type_phase: "PHASE_GROUPES" }], MODES_PHASES: [{ id_mode_phase: "MPH001", nom_mode_phase: "GROUPES" }, { id_mode_phase: "MPH002", nom_mode_phase: "ELIMINATION_DIRECTE" }],
    EQUIPES: [{ id_equipe: "E1", nom_equipe: "Aigles" }, { id_equipe: "E2", nom_equipe: "Lions" }], ...overrides,
  };
  let appended: Array<{ sheet: string; values: Record<string, string> }> = [], upserted: Array<{ sheet: string; idHeader: string; values: Record<string, string> }> = [];
  return { deps: { readRows: async ({ sheet }: { sheet: string }) => sheets[sheet] || [], appendRows: async ({ rows }: { rows: typeof appended }) => { appended = rows; }, upsertRows: async ({ rows }: { rows: typeof upserted }) => { upserted = rows; } } as never, get appended() { return appended; }, get upserted() { return upserted; } };
}

test("réinitialise tous les champs après la programmation d’un match", () => {
  assert.deepEqual(createInitialCompetitionMatchForm(), {
    eventId: "",
    phaseId: "",
    groupId: "",
    unitA: "",
    unitB: "",
    date: "",
    heure: "",
  });
});

test("propose la phase éliminatoire suivante même si les numéros de phase sont vides", () => {
  const phases = [
    { id: "PH-Q", eventId: "EPR-1", numero: "", statut: "ACTIF" },
    { id: "PH-D", eventId: "EPR-1", numero: "", statut: "ACTIF" },
    { id: "PH-F", eventId: "EPR-1", numero: "", statut: "ACTIF" },
    { id: "PH-X", eventId: "EPR-2", numero: "", statut: "ACTIF" },
  ];

  assert.deepEqual(
    competitionQualificationDestinations(phases, "PH-Q").map((phase) => phase.id),
    ["PH-D", "PH-F"],
  );
});

test("ne repropose pas une équipe déjà qualifiée dans la phase de destination", () => {
  const assignments = [
    { phaseId: "PH-Q", unitId: "U1", statut: "ACTIF" },
    { phaseId: "PH-Q", unitId: "U2", statut: "ACTIF" },
    { phaseId: "PH-D", unitId: "U1", statut: "ACTIF" },
  ];

  assert.deepEqual(competitionQualificationEligibleUnitIds(assignments, "PH-Q", "PH-D"), ["U2"]);
});

test("présente les matchs en résolvant phases, groupes et équipes par identifiant", async () => {
  const setup = fixture({ COMPETITIONS_MATCHS: [{ id_match: "M1", id_competition: "COMP-1", id_phase_competition: "PH-1", id_groupe: "GR-1", id_unite_a: "U1", id_unite_b: "U2" }] });
  const data = await getCompetitionPlay("COMP-1", setup.deps);
  assert.deepEqual({ phase: data.matches[0].phase, groupe: data.matches[0].groupe, a: data.matches[0].uniteA, b: data.matches[0].uniteB }, { phase: "Poules", groupe: "Groupe A", a: "Aigles", b: "Lions" });
});

test("relit les phases et groupes sans cache pour proposer toutes les poules", async () => {
  const setup = fixture();
  const base = setup.deps as unknown as { readRows: (params: { sheet: string; fresh?: boolean }) => Promise<SheetRow[]> };
  const calls: Array<{ sheet: string; fresh?: boolean }> = [];
  await getCompetitionPlay("COMP-1", {
    ...base,
    readRows: async (params: { sheet: string; fresh?: boolean }) => {
      calls.push(params);
      return base.readRows(params);
    },
  } as never);
  assert.equal(calls.find((call) => call.sheet === "COMPETITIONS_PHASES")?.fresh, true);
  assert.equal(calls.find((call) => call.sheet === "COMPETITIONS_GROUPES")?.fresh, true);
});

test("présente le statut de qualification depuis l’affectation à une phase ultérieure", async () => {
  const setup = fixture({
    COMPETITIONS_PHASES: [
      { id_phase_competition: "PH-1", id_competition: "COMP-1", id_type_phase: "TPH002", id_mode_phase: "MPH001", numero_phase: "1", nom_phase: "Poules" },
      { id_phase_competition: "PH-2", id_competition: "COMP-1", id_type_phase: "TPH002", id_mode_phase: "MPH002", numero_phase: "2", nom_phase: "Quarts de finale" },
    ],
    COMPETITIONS_PHASES_UNITES: [{ id_phase_unite: "PU-1", id_phase_competition: "PH-2", id_unite_competition: "U1", statut: "ACTIF" }],
    COMPETITIONS_CLASSEMENT: [{ id_classement: "CL-1", id_competition: "COMP-1", id_phase_competition: "PH-1", id_groupe: "GR-1", id_unite_competition: "U1", rang: "1", matchs_joues: "1", victoires: "1", defaites: "0", points_pour: "80", points_contre: "70", difference_points: "10", points_classement: "2" }],
  });
  const data = await getCompetitionPlay("COMP-1", setup.deps);
  assert.deepEqual(
    { statut: data.standings[0].qualificationStatus, destination: data.standings[0].qualificationPhase },
    { statut: "QUALIFIEE", destination: "Quarts de finale" },
  );
});

test("refuse un match avec une équipe non affectée au groupe", async () => {
  const setup = fixture({ COMPETITIONS_GROUPES_UNITES: [{ id_affectation_groupe: "A1", id_groupe: "GR-1", id_unite_competition: "U1", statut: "ACTIF" }] });
  await assert.rejects(createCompetitionMatch("COMP-1", { phaseId: "PH-1", groupId: "GR-1", uniteAId: "U1", uniteBId: "U2", date: "2026-09-12", heure: "18:00" }, setup.deps), (error: unknown) => error instanceof CompetitionParticipationError && error.code === "UNITES_INVALIDES");
});

test("programme un match uniquement dans COMPETITIONS_MATCHS", async () => {
  const setup = fixture();
  await createCompetitionMatch("COMP-1", { phaseId: "PH-1", groupId: "GR-1", uniteAId: "U1", uniteBId: "U2", date: "2026-09-12", heure: "18:00" }, setup.deps);
  assert.deepEqual(setup.appended.map((row) => row.sheet), ["COMPETITIONS_MATCHS"]);
  assert.equal(setup.appended[0].values.statut_match, "PROGRAMME");
  assert.match(setup.appended[0].values.id_match, /^BKB-MAT-COMP-1-\d{3}$/);
});

test("la programmation réussie ne dépend pas d'une relecture complète pouvant renvoyer 503", async () => {
  const route = await import("node:fs/promises").then((fs) => fs.readFile("app/api/competitions/[id]/play/route.ts", "utf8"));
  const panel = await import("node:fs/promises").then((fs) => fs.readFile("components/dashboard/competition-play-panel.tsx", "utf8"));
  assert.match(route, /action === "match" \? \{ created \}/);
  assert.match(panel, /setData\(current=>\(\{\.\.\.current,matches:\[\.\.\.current\.matches,/);
});

test("calcule le classement basket: victoire 2 points, défaite 1 point", () => {
  const rows = calculateStandings([{ id_match: "M1", id_competition: "COMP-1", id_phase_competition: "PH-1", id_groupe: "GR-1", id_unite_a: "U1", id_unite_b: "U2" }], [{ id_resultat: "R1", id_match: "M1", score_total_a: "80", score_total_b: "70", id_statut_resultat: "STR001" }], "COMP-1");
  assert.deepEqual(rows.map((row) => ({ unit: row.unitId, points: row.points, rank: row.rank, difference: row.difference })), [{ unit: "U1", points: 2, rank: 1, difference: 10 }, { unit: "U2", points: 1, rank: 2, difference: -10 }]);
});

test("enregistre résultat et classement dans un seul lot", async () => {
  const setup = fixture({ COMPETITIONS_MATCHS: [{ id_match: "M1", id_competition: "COMP-1", id_phase_competition: "PH-1", id_groupe: "GR-1", id_unite_a: "U1", id_unite_b: "U2" }] });
  await createCompetitionResult("COMP-1", { matchId: "M1", statutId: "STR001", qt1A: 20, qt1B: 15, qt2A: 20, qt2B: 15, qt3A: 20, qt3B: 15, qt4A: 20, qt4B: 15, prolongationA: 0, prolongationB: 0 }, setup.deps);
  assert.deepEqual(setup.upserted.map((row) => row.sheet), ["COMPETITIONS_RESULTATS", "COMPETITIONS_CLASSEMENT", "COMPETITIONS_CLASSEMENT"]);
  assert.equal(setup.upserted[0].values.score_total_a, "80");
  assert.match(setup.upserted[0].values.id_resultat, /^BKB-RES-COMP-1-\d{3}$/);
  assert.match(setup.upserted[1].values.id_classement, /^BKB-CLA-COMP-1-\d{3}$/);
  assert.equal(setup.upserted[1].values.points_classement, "2");
});

test("programme un match sans groupe dans une phase à élimination directe", async () => {
  const setup = fixture({ COMPETITIONS_PHASES: [{ id_phase_competition: "PH-2", id_competition: "COMP-1", id_type_phase: "TPH007", id_mode_phase: "MPH002", nom_phase: "Finale" }], COMPETITIONS_PHASES_UNITES: [{ id_phase_unite: "PU1", id_phase_competition: "PH-2", id_groupe: "", id_unite_competition: "U1", statut: "ACTIF" }, { id_phase_unite: "PU2", id_phase_competition: "PH-2", id_groupe: "", id_unite_competition: "U2", statut: "ACTIF" }] });
  await createCompetitionMatch("COMP-1", { phaseId: "PH-2", uniteAId: "U1", uniteBId: "U2", date: "2026-09-12", heure: "18:00" }, setup.deps);
  assert.equal(setup.appended[0].values.id_groupe, "");
});

test("enregistre un résultat hors groupes sans calculer de classement", async () => {
  const setup = fixture({
    COMPETITIONS_PHASES: [{ id_phase_competition: "PH-2", id_competition: "COMP-1", id_type_phase: "TPH007", id_mode_phase: "MPH002", nom_phase: "Finale" }],
    COMPETITIONS_MATCHS: [{ id_match: "M2", id_competition: "COMP-1", id_phase_competition: "PH-2", id_groupe: "", id_unite_a: "U1", id_unite_b: "U2" }],
  });
  await createCompetitionResult("COMP-1", { matchId: "M2", statutId: "STR001", qt1A: 20, qt1B: 15, qt2A: 20, qt2B: 15, qt3A: 20, qt3B: 15, qt4A: 20, qt4B: 15 }, setup.deps);
  assert.deepEqual(setup.upserted.map((row) => row.sheet), ["COMPETITIONS_RESULTATS"]);
});

test("refuse un second résultat pour le même match", async () => {
  const setup = fixture({ COMPETITIONS_MATCHS: [{ id_match: "M1", id_competition: "COMP-1", id_phase_competition: "PH-1", id_groupe: "GR-1", id_unite_a: "U1", id_unite_b: "U2" }], COMPETITIONS_RESULTATS: [{ id_resultat: "R1", id_match: "M1", id_statut_resultat: "STR001" }] });
  await assert.rejects(createCompetitionResult("COMP-1", { matchId: "M1", statutId: "STR005" }, setup.deps), (error: unknown) => error instanceof CompetitionParticipationError && error.code === "RESULTAT_DUPLIQUE");
});

test("retire immédiatement de la sélection un match dont le résultat vient d’être enregistré", () => {
  const matches = [{ id: "M1" }, { id: "M2" }, { id: "M3" }];
  const pending = pendingCompetitionMatches(matches, ["M1"], ["M2"]);
  assert.deepEqual(pending.map((match) => match.id), ["M3"]);
});

test("réinitialise tous les scores après l’enregistrement d’un résultat", () => {
  assert.deepEqual(createInitialCompetitionScores(), {
    qt1A: "", qt1B: "", qt2A: "", qt2B: "", qt3A: "", qt3B: "", qt4A: "", qt4B: "",
    prolongationA: "0", prolongationB: "0",
  });
});

test("qualifie explicitement une unité dans la feuille canonique", async () => {
  const setup = fixture({ COMPETITIONS_PHASES: [{ id_phase_competition: "PH-2", id_competition: "COMP-1", id_type_phase: "TPH005", id_mode_phase: "MPH002", statut: "ACTIF" }] });
  const created = await createCompetitionPhaseUnit("COMP-1", { idPhaseCompetition: "PH-2", idUniteCompetition: "U1", idGroupe: "" }, setup.deps);
  assert.match(created.id, /^BKB-PHU-COMP-1-\d{3}$/);
  assert.deepEqual(setup.appended.map((row) => row.sheet), ["COMPETITIONS_PHASES_UNITES"]);
  assert.equal(setup.appended[0].values.id_unite_competition, "U1");
});

test("trace une qualification quart vers demi avec son match source", async () => {
  const setup=fixture({
    COMPETITIONS_PHASES:[{id_phase_competition:"PH-Q",id_competition:"COMP-1",id_epreuve_competition:"EPR-1",id_mode_phase:"MPH002",numero_phase:"2"},{id_phase_competition:"PH-D",id_competition:"COMP-1",id_epreuve_competition:"EPR-1",id_mode_phase:"MPH002",numero_phase:"3"}],
    COMPETITIONS_UNITES:[{id_unite_competition:"U1",id_competition:"COMP-1",id_epreuve_competition:"EPR-1",id_equipe:"E1",statut:"ACTIF"},{id_unite_competition:"U2",id_competition:"COMP-1",id_epreuve_competition:"EPR-1",id_equipe:"E2",statut:"ACTIF"}],
    COMPETITIONS_PHASES_UNITES:[{id_phase_unite:"PU1",id_phase_competition:"PH-Q",id_unite_competition:"U1",statut:"ACTIF"}],
    COMPETITIONS_MATCHS:[{id_match:"M-Q",id_competition:"COMP-1",id_phase_competition:"PH-Q",id_unite_a:"U1",id_unite_b:"U2"}],
    COMPETITIONS_RESULTATS:[{id_resultat:"R-Q",id_match:"M-Q",id_statut_resultat:"STR001",id_unite_vainqueur:"U1"}],
  });
  await createCompetitionPhaseUnit("COMP-1",{idPhaseCompetition:"PH-D",idUniteCompetition:"U1",sourcePhaseId:"PH-Q",sourceMatchId:"M-Q",typeId:"TAP002",date:"2026-09-12"},setup.deps);
  assert.equal(setup.appended[0].values.id_phase_source,"PH-Q");assert.equal(setup.appended[0].values.id_match_source,"M-Q");assert.equal(setup.appended[0].values.id_type_affectation_phase,"TAP002");
});

test("refuse une qualification vers une phase antérieure ou une autre épreuve", async () => {
  const setup=fixture({COMPETITIONS_PHASES:[{id_phase_competition:"P1",id_competition:"COMP-1",id_epreuve_competition:"E1",id_mode_phase:"MPH002",numero_phase:"1"},{id_phase_competition:"P2",id_competition:"COMP-1",id_epreuve_competition:"E1",id_mode_phase:"MPH002",numero_phase:"2"},{id_phase_competition:"PX",id_competition:"COMP-1",id_epreuve_competition:"E2",id_mode_phase:"MPH002",numero_phase:"3"}],COMPETITIONS_UNITES:[{id_unite_competition:"U1",id_competition:"COMP-1",id_epreuve_competition:"E1",statut:"ACTIF"}],COMPETITIONS_PHASES_UNITES:[{id_phase_unite:"X",id_phase_competition:"P2",id_unite_competition:"U1",statut:"ACTIF"}]});
  await assert.rejects(createCompetitionPhaseUnit("COMP-1",{idPhaseCompetition:"P1",idUniteCompetition:"U1",sourcePhaseId:"P2",typeId:"TAP002"},setup.deps),(e:unknown)=>e instanceof CompetitionParticipationError&&e.code==="PHASE_DESTINATION_ANTERIEURE");
  await assert.rejects(createCompetitionPhaseUnit("COMP-1",{idPhaseCompetition:"PX",idUniteCompetition:"U1",sourcePhaseId:"P2",typeId:"TAP002"},setup.deps),(e:unknown)=>e instanceof CompetitionParticipationError&&e.code==="EPREUVE_INCOMPATIBLE");
});

test("crée plusieurs qualifications dans un seul lot atomique",async()=>{const setup=fixture({COMPETITIONS_PHASES:[{id_phase_competition:"S",id_competition:"COMP-1",id_epreuve_competition:"E",id_mode_phase:"MPH002",numero_phase:"1"},{id_phase_competition:"D",id_competition:"COMP-1",id_epreuve_competition:"E",id_mode_phase:"MPH002",numero_phase:"2"}],COMPETITIONS_UNITES:[{id_unite_competition:"U1",id_competition:"COMP-1",id_epreuve_competition:"E",statut:"ACTIF"},{id_unite_competition:"U2",id_competition:"COMP-1",id_epreuve_competition:"E",statut:"ACTIF"}],COMPETITIONS_PHASES_UNITES:[{id_phase_unite:"A",id_phase_competition:"S",id_unite_competition:"U1",statut:"ACTIF"},{id_phase_unite:"B",id_phase_competition:"S",id_unite_competition:"U2",statut:"ACTIF"}]});const result=await createCompetitionQualifications("COMP-1",{sourcePhaseId:"S",destinationPhaseId:"D",unitIds:["U1","U2"],typeId:"TAP002"},setup.deps);assert.equal(result.ids.length,2);assert.equal(setup.appended.length,2);assert.notEqual(setup.appended[0].values.id_phase_unite,setup.appended[1].values.id_phase_unite)});

test("une phase de groupes exige un groupe et l’élimination directe le refuse", async () => {
  await assert.rejects(createCompetitionPhaseUnit("COMP-1", { idPhaseCompetition: "PH-1", idUniteCompetition: "U1" }, fixture().deps), (error: unknown) => error instanceof CompetitionParticipationError && error.code === "GROUPE_REQUIS");
  const knockout = fixture({ COMPETITIONS_PHASES: [{ id_phase_competition: "PH-2", id_competition: "COMP-1", id_mode_phase: "MPH002", statut: "ACTIF" }] });
  await assert.rejects(createCompetitionPhaseUnit("COMP-1", { idPhaseCompetition: "PH-2", idUniteCompetition: "U1", idGroupe: "GR-1" }, knockout.deps), (error: unknown) => error instanceof CompetitionParticipationError && error.code === "GROUPE_INTERDIT");
});

test("l’interface pilote groupes, unités et qualifications par le mode de phase", async () => {
  const source = await import("node:fs/promises").then((fs) => fs.readFile("components/dashboard/competition-play-panel.tsx", "utf8"));
  assert.match(source, /selectedPhase\?\.modeId === "MPH001"/);
  assert.match(source, /competitionQualificationDestinations\(phases, sourcePhaseId\)/);
  assert.match(source, /sourcePhaseId/);
  assert.match(source, /row\.phaseId === phaseId/);
  assert.doesNotMatch(source, /Qualifier le vainqueur/);
  assert.match(source, /Qualifier l’équipe/);
  assert.match(source, /submitting\.current/);
  assert.match(source, /Équipes qualifiées/);
  assert.match(source, /assignment\.phaseId === phase\.id/);
  assert.match(source, /<table className="w-full text-sm">/);
  assert.match(source, /<Dialog open=\{open\}/);
  assert.match(source, /Sélectionner les qualifiés/);
  assert.match(source, /action:"qualifications"/);
  assert.match(source, /unitIds:selected/);
  assert.match(source, /grid gap-4 md:grid-cols-2/);
  assert.match(source, /\[&_\[data-slot=select-trigger\]\]:w-full/);
  assert.match(source, /\[&_\[data-slot=select-trigger\]\]:min-w-0/);
});

test("la route réserve toute qualification au rôle fédéral", async () => {
  const source = await import("node:fs/promises").then((fs) => fs.readFile("app/api/competitions/[id]/play/route.ts", "utf8"));
  assert.match(source, /user\.role !== "federal"/);
  assert.match(source, /action === "phase-unit"/);
});

test("le flux play réutilise le cache Sheets entre deux lectures", async () => {
  const source = await import("node:fs/promises").then((fs) => fs.readFile("lib/competition-play.ts", "utf8"));
  assert.doesNotMatch(source, /fresh:\s*true/);
});
