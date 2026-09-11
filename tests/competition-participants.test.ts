import assert from "node:assert/strict";
import test from "node:test";
import { CompetitionParticipationError, createCompetitionParticipations, getCompetitionParticipants, listAllCompetitionParticipants } from "../lib/competition-participants";
import type { SheetRow } from "../lib/google-sheets";

function fixture(overrides: Record<string, SheetRow[]> = {}, failWrite = false) {
  const sheets: Record<string, SheetRow[]> = {
    COMPETITIONS: [{ id_competition: "COMP-1" }, { id_competition: "COMP-2" }],
    COMPETITIONS_PARTICIPANTS: [], COMPETITIONS_UNITES: [], COMPETITIONS_GROUPES_UNITES: [],
    COMPETITIONS_PHASES: [{ id_phase_competition: "PH-1", id_competition: "COMP-1" }, { id_phase_competition: "PH-2", id_competition: "COMP-2" }],
    COMPETITIONS_GROUPES: [{ id_groupe: "GR-1", id_phase_competition: "PH-1", nom_groupe: "Groupe A" }, { id_groupe: "GR-2", id_phase_competition: "PH-2", nom_groupe: "Groupe étranger" }],
    CLUBS: [{ id_club: "C1", nom_club: "Aigles" }, { id_club: "C2", nom_club: "Sans équipe" }],
    EQUIPES: [{ id_equipe: "E1", id_club: "C1", nom_equipe: "Aigles A", id_categorie_age: "CAT1", id_sexe: "SEX1" }, { id_equipe: "E2", id_club: "C1", nom_equipe: "Aigles B", id_categorie_age: "CAT2", id_sexe: "SEX2" }],
    CATEGORIES_AGE: [{ id_categorie_age: "CAT1", nom_categorie_age: "Senior" }, { id_categorie_age: "CAT2", nom_categorie_age: "U18" }],
    SEXES: [{ id_sexe: "SEX1", nom_sexe: "Masculin" }, { id_sexe: "SEX2", nom_sexe: "Féminin" }],
    ...overrides,
  };
  let batch: Array<{ sheet: string; values: Record<string, string> }> = [];
  return {
    deps: {
      readRows: async ({ sheet }: { sheet: string }) => sheets[sheet] || [],
      appendRows: async ({ rows }: { rows: typeof batch }) => { if (failWrite) throw new Error("batch failed"); batch = rows; },
    } as never,
    get batch() { return batch; },
  };
}

const valid = { clubTeams: [{ clubId: "C1", teamId: "E1" }], groupId: "GR-1", dateInscription: "2026-09-11", statutParticipation: "INSCRIT", observations: "" };

test("charge uniquement les groupes de la compétition et les équipes de chaque club", async () => {
  const result = await getCompetitionParticipants("COMP-1", fixture().deps);
  assert.deepEqual(result.groups, [{ id: "GR-1", label: "Groupe A" }]);
  assert.equal(result.teams.filter((team) => team.clubId === "C1").length, 2);
  assert.equal(result.teams.some((team) => team.clubId === "C2"), false);
});

test("conserve un club sans équipe dans la liste", async () => {
  const result = await getCompetitionParticipants("COMP-1", fixture().deps);
  assert.equal(result.clubs.find((club) => club.id === "C2")?.nom, "Sans équipe");
});

test("refuse un groupe appartenant à une autre compétition", async () => {
  await assert.rejects(createCompetitionParticipations("COMP-1", { ...valid, groupId: "GR-2" }, fixture().deps), (error: unknown) => error instanceof CompetitionParticipationError && error.code === "GROUPE_INVALIDE");
});

test("refuse le doublon d'une équipe dans la compétition", async () => {
  const setup = fixture({ COMPETITIONS_PARTICIPANTS: [{ id_participation: "1", id_competition: "COMP-1", id_equipe: "E1" }] });
  await assert.rejects(createCompetitionParticipations("COMP-1", valid, setup.deps), (error: unknown) => error instanceof CompetitionParticipationError && error.code === "PARTICIPATION_DUPLIQUEE");
});

test("ne présente pas une écriture partielle comme un succès", async () => {
  await assert.rejects(createCompetitionParticipations("COMP-1", valid, fixture({}, true).deps), (error: unknown) => error instanceof CompetitionParticipationError && error.code === "ECRITURE_INCOMPLETE");
});

test("écrit participation, unité et groupe dans un seul lot cohérent", async () => {
  const setup = fixture();
  const created = await createCompetitionParticipations("COMP-1", valid, setup.deps);
  assert.equal(created.length, 1);
  assert.deepEqual(setup.batch.map((row) => row.sheet), ["COMPETITIONS_PARTICIPANTS", "COMPETITIONS_UNITES", "COMPETITIONS_GROUPES_UNITES"]);
  assert.equal(setup.batch[0].values.id_equipe, "E1");
  assert.equal(setup.batch[1].values.id_participation, setup.batch[0].values.id_participation);
  assert.equal(setup.batch[2].values.id_unite_competition, setup.batch[1].values.id_unite_competition);
});

test("écrit trois lignes cohérentes pour chacun des clubs sélectionnés", async () => {
  const setup = fixture();
  const created = await createCompetitionParticipations("COMP-1", { ...valid, clubTeams: [{ clubId: "C1", teamId: "E1" }, { clubId: "C1", teamId: "E2" }] }, setup.deps);
  assert.equal(created.length, 2);
  assert.equal(setup.batch.length, 6);
  assert.notEqual(created[0].participationId, created[1].participationId);
});

test("l'interface masque l'écriture aux rôles non fédéraux et évite le débordement horizontal", async () => {
  const source = await import("node:fs/promises").then((fs) => fs.readFile("components/dashboard/competition-participants-panel.tsx", "utf8"));
  assert.match(source, /federal \? <Button/);
  assert.match(source, /md:hidden/);
  assert.match(source, /hidden min-w-0 grid-cols-7 md:grid/);
  assert.doesNotMatch(source, /overflow-x-auto/);
});

test("la liste globale résout club, équipe et groupe uniquement par identifiants", async () => {
  const setup = fixture({
    COMPETITIONS_PARTICIPANTS: [{ id_participation: "1", id_competition: "COMP-1", id_equipe: "E1", date_inscription: "2026-09-11", statut_participation: "INSCRIT" }],
    COMPETITIONS_UNITES: [{ id_unite_competition: "1", id_competition: "COMP-1", id_equipe: "E1", id_participation: "1" }],
    COMPETITIONS_GROUPES_UNITES: [{ id_affectation_groupe: "1", id_groupe: "GR-1", id_unite_competition: "1", statut: "ACTIF" }],
  });
  const [item] = await listAllCompetitionParticipants(setup.deps);
  assert.deepEqual({ club: item.club, equipe: item.equipe, groupe: item.groupe }, { club: "Aigles", equipe: "Aigles A", groupe: "Groupe A" });
});
