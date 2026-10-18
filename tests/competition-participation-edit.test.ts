import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { changeCompetitionParticipation } from "../lib/competition-participation-edit";
import { createCompetitionParticipations, getCompetitionParticipants, listAllCompetitionParticipants } from "../lib/competition-participants";
import { mergeCompetitionPhaseUnits } from "../lib/competition-phase-units";
import type { SheetRow } from "../lib/google-sheets";

function fixture(overrides: Record<string, SheetRow[]> = {}, fail = false) {
  const data: Record<string, SheetRow[]> = {
    COMPETITIONS: [{ id_competition: "C1", statut: "TERMINEE" }],
    COMPETITIONS_EPREUVES: [{ id_competition: "C1", id_epreuve_competition: "E", id_discipline: "D", id_categorie_age: "CAT", id_sexe: "SEX", statut: "ACTIF" }],
    COMPETITIONS_PARTICIPANTS: [{ id_competition: "C1", id_participation: "P", id_equipe: "T", statut_participation: "INSCRIT", date_inscription: "2026-01-01" }],
    COMPETITIONS_UNITES: [{ id_competition: "C1", id_unite_competition: "U", id_participation: "P", id_equipe: "T", id_epreuve_competition: "E", statut: "ACTIF" }],
    COMPETITIONS_PHASES: [{ id_competition: "C1", id_phase_competition: "PH", id_epreuve_competition: "E", id_mode_phase: "MPH001", statut: "ACTIF" }],
    COMPETITIONS_GROUPES: [{ id_groupe: "G1", id_phase_competition: "PH" }, { id_groupe: "G2", id_phase_competition: "PH" }, { id_groupe: "FOREIGN", id_phase_competition: "OTHER" }],
    COMPETITIONS_PHASES_UNITES: [], COMPETITIONS_GROUPES_UNITES: [{ id_affectation_groupe: "OLD", id_groupe: "G1", id_unite_competition: "U", statut: "ACTIF" }],
    CLUBS: [{ id_club: "CL", nom_club: "Club" }], EQUIPES: [{ id_equipe: "T", id_club: "CL", nom_equipe: "Equipe", id_discipline: "D", id_categorie_age: "CAT", id_sexe: "SEX" }],
    CATEGORIES_AGE: [], SEXES: [], MODES_PHASES: [], COMPETITIONS_MATCHS: [], COMPETITIONS_INTERVENANTS: [], ...overrides,
  };
  let writes = 0;
  const deps = {
    readRows: async (params: { sheet: string } | string) => data[typeof params === "string" ? params : params.sheet] || [],
    upsertRows: async ({ rows }: { rows: Array<{ sheet: string; idHeader: string; values: SheetRow }> }) => {
      if (fail) throw Error("offline"); writes++;
      for (const row of rows) {
        const values = data[row.sheet] ||= [], index = values.findIndex(item => item[row.idHeader] === row.values[row.idHeader]);
        if (index < 0) values.push(row.values); else values[index] = { ...values[index], ...row.values };
      }
    },
    appendRows: async ({ rows }: { rows: Array<{ sheet: string; values: SheetRow }> }) => { for (const row of rows) (data[row.sheet] ||= []).push(row.values); },
  };
  return { data, deps, get writes() { return writes } };
}
const body = { clubTeams: [{ clubId: "CL", teamId: "T" }], epreuveId: "E", phaseId: "PH", groupId: "G2", dateInscription: "2026-01-02", statutParticipation: "INSCRIT", observations: "Modifie" };

test("modifie le groupe via les validations d'ajout, garde les IDs et masque l'ancien historique", async () => {
  const f = fixture();
  await changeCompetitionParticipation("C1", "P", body, false, f.deps);
  assert.equal(f.writes, 1);
  const payload = await getCompetitionParticipants("C1", f.deps);
  assert.equal(payload.participants[0].id, "P"); assert.equal(payload.participants[0].unitId, "U"); assert.equal(payload.participants[0].groupId, "G2");
  assert.deepEqual(payload.participants[0].assignments, [{ phaseId: "PH", groupId: "G2" }]);
  assert.equal(mergeCompetitionPhaseUnits(f.data.COMPETITIONS_PHASES_UNITES, f.data.COMPETITIONS_GROUPES_UNITES, f.data.COMPETITIONS_GROUPES).length, 1);
});

test("suppression atomique logique, listes vides et réinscription possible", async () => {
  const f = fixture(); await changeCompetitionParticipation("C1", "P", null, true, f.deps);
  assert.equal(f.writes, 1);
  assert.deepEqual((await getCompetitionParticipants("C1", f.deps)).participants, []);
  assert.deepEqual(await listAllCompetitionParticipants(f.deps), []);
  assert.ok(mergeCompetitionPhaseUnits(f.data.COMPETITIONS_PHASES_UNITES, f.data.COMPETITIONS_GROUPES_UNITES, f.data.COMPETITIONS_GROUPES).every(row => row.statut === "INACTIF"));
  await createCompetitionParticipations("C1", body, f.deps);
  const active = (await getCompetitionParticipants("C1", f.deps)).participants;
  assert.equal(active.length, 1); assert.notEqual(active[0].id, "P"); assert.notEqual(active[0].unitId, "U");
});

test("refuse références étrangères, matchs incohérents, intervenants et pannes sans faux succès", async () => {
  const f = fixture();
  await assert.rejects(changeCompetitionParticipation("OTHER", "P", body, false, f.deps), /n’existe pas/);
  await assert.rejects(changeCompetitionParticipation("C1", "P", { ...body, groupId: "FOREIGN" }, false, f.deps), /groupe/);
  const used = fixture({ COMPETITIONS_MATCHS: [{ id_competition: "C1", id_phase_competition: "PH", id_unite_a: "U", id_unite_b: "OTHER" }] });
  await assert.rejects(changeCompetitionParticipation("C1", "P", body, false, used.deps), /matchs/);
  await assert.rejects(changeCompetitionParticipation("C1", "P", null, true, used.deps), /matchs/);
  const people = fixture({ COMPETITIONS_INTERVENANTS: [{ id_competition: "C1", id_unite_competition: "U" }] });
  await assert.rejects(changeCompetitionParticipation("C1", "P", null, true, people.deps), /intervenants/);
  const offline = fixture({}, true);
  await assert.rejects(changeCompetitionParticipation("C1", "P", body, false, offline.deps), /offline/);
  assert.equal(f.writes, 0); assert.equal(used.writes, 0); assert.equal(people.writes, 0); assert.equal(offline.writes, 0);
});

test("les nouvelles mutations restent protégées et fédérales, actions présentes ordinateur/mobile", async () => {
  const route = await readFile("app/api/competitions/[id]/participants/[participationId]/route.ts", "utf8"), ui = await readFile("components/dashboard/competition-participants-panel.tsx", "utf8");
  assert.match(route, /user.role !== "federal"/); assert.match(route, /export const PUT = protectedRoute/); assert.match(route, /export const DELETE = protectedRoute/);
  assert.match(ui, /editing \? "PUT" : "POST"/); assert.equal((ui.match(/\{actions\(item\)\}/g) || []).length, 2);
});
