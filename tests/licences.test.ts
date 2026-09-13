import assert from "node:assert/strict";
import test from "node:test";
import { getAthleteLicenceEligibility, listAthleteLicences, renewAthleteLicences, updateAthleteLicence, LicenceError } from "../lib/licences";
import type { SheetRow } from "../lib/google-sheets";

const base: Record<string, SheetRow[]> = {
  ATHLETE_LICENCES: [],
  ATHLETE_AFFILIATIONS: [
    { id_affiliation_athlete: "AFA-1", id_athlete: "ATH-1", id_equipe: "EQ-1", date_debut: "2026-01-01", date_fin: "", id_statut_affiliation: "SAF001" },
    { id_affiliation_athlete: "AFA-2", id_athlete: "ATH-2", id_equipe: "EQ-1", date_debut: "2026-01-01", date_fin: "", id_statut_affiliation: "SAF001" },
    { id_affiliation_athlete: "AFA-3", id_athlete: "ATH-3", id_equipe: "EQ-2", date_debut: "2026-01-01", date_fin: "", id_statut_affiliation: "SAF001" },
  ],
  ATHLETES: [{ id_athlete: "ATH-1", nom_complet: "Alice" }, { id_athlete: "ATH-2", nom_complet: "Béatrice" }, { id_athlete: "ATH-3", nom_complet: "Chantal" }],
  EQUIPES: [{ id_equipe: "EQ-1", nom_equipe: "Matonge", id_club: "CL-1" }, { id_equipe: "EQ-2", nom_equipe: "Terreur", id_club: "CL-2" }],
  CLUBS: [{ id_club: "CL-1", nom_club: "Matonge", id_entente: "ENT-1" }, { id_club: "CL-2", nom_club: "Terreur", id_entente: "ENT-2" }],
  ENTENTES: [{ id_entente: "ENT-1", id_ligue: "LIG-1" }, { id_entente: "ENT-2", id_ligue: "LIG-2" }],
  SAISON: [{ id_saison: "SAI006", nom_saison: "2026" }],
  STATUT_LICENCE: [{ id_statut_licence: "STL001", nom_statut_licence: "ACTIVE" }, { id_statut_licence: "STL003", nom_statut_licence: "SUSPENDUE" }],
};

function fixture(overrides: Record<string, SheetRow[]> = {}) {
  const sheets = { ...base, ...overrides }, batches: Array<Array<{ sheet: string; values: Record<string, string> }>> = [], upserts: unknown[] = [];
  return { deps: { readRows: async ({ sheet }: { sheet: string }) => sheets[sheet] || [], appendRows: async ({ rows }: { rows: Array<{ sheet: string; values: Record<string, string> }> }) => { batches.push(rows); }, upsertRows: async (args: unknown) => { upserts.push(args); } } as never, batches, upserts };
}

test("liste les licences enrichies et applique le scope territorial", async () => {
  const setup = fixture({ ATHLETE_LICENCES: [
    { id_licence: "LIC-1", id_athlete: "ATH-1", id_saison: "SAI006", id_affiliation_athlete: "AFA-1", numero_licence: "100", date_delivrance: "2026-01-02", id_statut_licence: "STL001" },
    { id_licence: "LIC-2", id_athlete: "ATH-3", id_saison: "SAI006", id_affiliation_athlete: "AFA-3", numero_licence: "200", date_delivrance: "2026-01-02", id_statut_licence: "STL001" },
  ] });
  const result = await listAthleteLicences({}, { role: "ligue", ligueId: "LIG-1" }, setup.deps);
  assert.deepEqual(result.licences.map((item) => item.id), ["LIC-1"]);
  assert.equal(result.licences[0].athleteNom, "Alice"); assert.equal(result.licences[0].equipeNom, "Matonge"); assert.equal(result.licences[0].statut, "ACTIVE");
});

test("l'éligibilité équipe garde visibles les athlètes déjà licenciés", async () => {
  const setup = fixture({ ATHLETE_LICENCES: [{ id_licence: "LIC-1", id_athlete: "ATH-1", id_saison: "SAI006", id_affiliation_athlete: "AFA-1" }] });
  const result = await getAthleteLicenceEligibility({ mode: "EQUIPE", seasonId: "SAI006", teamId: "EQ-1" }, { role: "federal" }, setup.deps);
  assert.equal(result.candidates.length, 2);
  assert.equal(result.candidates.find((item) => item.athleteId === "ATH-1")?.alreadyLicensed, true);
  assert.equal(result.candidates.find((item) => item.athleteId === "ATH-2")?.alreadyLicensed, false);
});

test("renouvelle individuellement depuis une affiliation réelle", async () => {
  const setup = fixture();
  const created = await renewAthleteLicences({ mode: "ATHLETE", id_saison: "SAI006", id_affiliation_athlete: "AFA-1", numero_licence: "100", date_delivrance: "2026-09-13", id_statut_licence: "STL001", observations: "" }, setup.deps, () => "BKB-LIC-2026-000001");
  assert.equal(created.length, 1); assert.equal(setup.batches.length, 1);
  assert.deepEqual(setup.batches[0][0].values, { id_licence: "BKB-LIC-2026-000001", id_athlete: "ATH-1", id_saison: "SAI006", id_affiliation_athlete: "AFA-1", numero_licence: "100", date_delivrance: "2026-09-13", id_statut_licence: "STL001", observations: "" });
});

test("refuse le doublon athlète et saison sans écriture", async () => {
  const setup = fixture({ ATHLETE_LICENCES: [{ id_licence: "LIC-1", id_athlete: "ATH-1", id_saison: "SAI006" }] });
  await assert.rejects(renewAthleteLicences({ mode: "ATHLETE", id_saison: "SAI006", id_affiliation_athlete: "AFA-1", date_delivrance: "2026-09-13", id_statut_licence: "STL001" }, setup.deps, () => "X"), (error: unknown) => error instanceof LicenceError && error.status === 409);
  assert.equal(setup.batches.length, 0);
});

test("refuse une affiliation inactive, future ou clôturée", async () => {
  for (const affiliation of [
    { ...base.ATHLETE_AFFILIATIONS[0], id_statut_affiliation: "SAF002" },
    { ...base.ATHLETE_AFFILIATIONS[0], date_debut: "2099-01-01" },
    { ...base.ATHLETE_AFFILIATIONS[0], date_fin: "2025-12-31" },
  ]) {
    const setup = fixture({ ATHLETE_AFFILIATIONS: [affiliation] });
    await assert.rejects(renewAthleteLicences({ mode: "ATHLETE", id_saison: "SAI006", id_affiliation_athlete: "AFA-1", date_delivrance: "2026-09-13", id_statut_licence: "STL001" }, setup.deps, () => "X"), /admissible/i);
    assert.equal(setup.batches.length, 0);
  }
});

test("exige une observation pour le statut AUTRE", async () => {
  const setup = fixture({ STATUT_LICENCE: [...base.STATUT_LICENCE, { id_statut_licence: "STL099", nom_statut_licence: "AUTRE" }] });
  await assert.rejects(renewAthleteLicences({ mode: "ATHLETE", id_saison: "SAI006", id_affiliation_athlete: "AFA-1", date_delivrance: "2026-09-13", id_statut_licence: "STL099", observations: "" }, setup.deps, () => "X"), (error: unknown) => error instanceof LicenceError && !!error.fields.observations);
});

test("valide tout le lot équipe avant une écriture atomique", async () => {
  const setup = fixture();
  await assert.rejects(renewAthleteLicences({ mode: "EQUIPE", id_saison: "SAI006", id_equipe: "EQ-1", id_affiliations_athletes: ["AFA-1", "AFA-3"], date_delivrance: "2026-09-13", id_statut_licence: "STL001" }, setup.deps, () => "X"), /équipe/i);
  assert.equal(setup.batches.length, 0);
});

test("crée plusieurs licences dans un seul lot", async () => {
  const setup = fixture(); let sequence = 0;
  const created = await renewAthleteLicences({ mode: "EQUIPE", id_saison: "SAI006", id_equipe: "EQ-1", id_affiliations_athletes: ["AFA-1", "AFA-2"], date_delivrance: "2026-09-13", id_statut_licence: "STL001" }, setup.deps, () => `LIC-${++sequence}`);
  assert.equal(created.length, 2); assert.equal(setup.batches.length, 1); assert.equal(setup.batches[0].length, 2);
});

test("exclut du lot équipe les athlètes déjà licenciés", async () => {
  const setup = fixture({ ATHLETE_LICENCES: [{ id_licence: "LIC-OLD", id_athlete: "ATH-1", id_saison: "SAI006" }] });
  const created = await renewAthleteLicences({ mode: "EQUIPE", id_saison: "SAI006", id_equipe: "EQ-1", id_affiliations_athletes: ["AFA-1", "AFA-2"], date_delivrance: "2026-09-13", id_statut_licence: "STL001" }, setup.deps, () => "LIC-NEW");
  assert.deepEqual(created.map((row) => row.id_athlete), ["ATH-2"]);
  assert.equal(setup.batches[0].length, 1);
});

test("le PUT conserve les relations et ne modifie que les champs administratifs", async () => {
  const setup = fixture({ ATHLETE_LICENCES: [{ id_licence: "LIC-1", id_athlete: "ATH-1", id_saison: "SAI006", id_affiliation_athlete: "AFA-1", numero_licence: "100", id_statut_licence: "STL001" }] });
  await updateAthleteLicence("LIC-1", { id_athlete: "ATH-3", numero_licence: "101", date_delivrance: "2026-09-13", id_statut_licence: "STL003", observations: "Suspendue" }, setup.deps);
  const values = (setup.upserts[0] as { rows: Array<{ values: SheetRow }> }).rows[0].values;
  assert.equal(values.id_licence, "LIC-1"); assert.equal(values.id_athlete, "ATH-1"); assert.equal(values.id_saison, "SAI006"); assert.equal(values.numero_licence, "101");
});
