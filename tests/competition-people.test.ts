import assert from "node:assert/strict";
import test from "node:test";
import { addCompetitionPerson, getCompetitionPeople } from "../lib/competition-people";
import type { SheetRow } from "../lib/google-sheets";

function fixture(overrides: Record<string, SheetRow[]> = {}) {
  const sheets: Record<string, SheetRow[]> = {
    COMPETITIONS: [{ id_competition: "COMP-1", id_saison: "SAI006", date_debut: "2026-09-01", date_fin: "2026-09-10" }],
    COMPETITIONS_PARTICIPANTS: [{ id_participation: "P1", id_competition: "COMP-1", id_equipe: "E1" }],
    COMPETITIONS_INTERVENANTS: [],
    EQUIPES: [{ id_equipe: "E1", nom_equipe: "Matonge Senior", id_club: "C1" }], CLUBS: [{ id_club: "C1", nom_club: "Matonge" }],
    ATHLETES: [{ id_athlete: "ATH1", nom_complet: "Jean Test" }, { id_athlete: "ATH2", nom_complet: "Hors compétition" }],
    ARBITRES: [{ id_arbitre: "ARB1", nom_complet: "Arbitre non affecté", id_grade_arbitre: "G1" }], OFFICIELS: [{ id_officiel: "OFF1", nom_complet: "Officiel Club" }], MEDECINS: [{ id_medecin: "MED1", nom_complet: "Docteur Club", id_specialite: "S1" }], AUTRES: [{ id_autre_acteur: "AUT1", nom_complet: "Logisticien Test" }],
    ATHLETE_AFFILIATIONS: [{ id_athlete: "ATH1", id_equipe: "E1", id_statut_affiliation: "SAF001" }],
    MEDECINS_AFFILIATIONS: [{ id_medecin: "MED1", id_equipe: "E1", id_statut_affiliation: "SAF001" }],
    OFFICIELS_AFFILIATIONS: [{ id_officiel: "OFF1", id_fonction: "F1", id_type_entite: "STR003", id_entite: "C1", id_statut_affiliation: "SAF001" }], AUTRES_AFFILIATIONS: [],
    FONCTIONS: [{ id_fonction: "F1", nom_fonction: "Manager" }], GRADES_ARBITRES: [{ id_grade_arbitre: "G1", nom_grade_arbitre: "National" }], SPECIALITES_MEDECINS: [{ id_specialite: "S1", nom_specialite: "Urgentiste" }], TYPES_AUTRES_ACTEURS: [],
    ATHLETE_LICENCES: [{ id_licence: "L1", id_athlete: "ATH1", id_saison: "SAI006", numero_licence: "3801", id_statut_licence: "STL001" }],
    ACTEURS_LICENCES: [{ id_licence: "L2", id_type_acteur: "TAC004", id_acteur: "ARB1", numero_licence: "3802", date_debut_validite: "2026-01-01", date_fin_validite: "2026-12-31", id_statut_licence: "STL001" }],
    ...overrides,
  };
  let writes: Array<{ sheet: string; values: Record<string, string> }> = [];
  return { deps: { readRows: async ({ sheet }: { sheet: string }) => sheets[sheet] || [], appendRows: async ({ rows }: { rows: typeof writes }) => { writes = rows; } } as never, get writes() { return writes; } };
}

test("liste uniquement les athlètes explicitement inscrits à la compétition", async () => {
  const result = await getCompetitionPeople("COMP-1", fixture({ COMPETITIONS_INTERVENANTS: [{ id_intervenant_competition: "I1", id_competition: "COMP-1", type_participant: "ATHLETE", id_acteur: "ATH1", id_equipe: "E1", id_club: "C1", statut: "ACTIF" }] }).deps);
  assert.deepEqual(result.athletes.map((person) => person.id), ["ATH1"]);
  assert.deepEqual({ club: result.athletes[0].club, equipe: result.athletes[0].equipe, detail: result.athletes[0].detail }, { club: "Matonge", equipe: "Matonge Senior", detail: "-" });
});

test("ne lit aucune feuille de membres absente du classeur compétitions", async () => {
  const setup = fixture();
  const base = setup.deps as unknown as { readRows: (params: { sheet: string }) => Promise<SheetRow[]> };
  const sheets: string[] = [];
  await getCompetitionPeople("COMP-1", {
    ...base,
    readRows: async (params: { sheet: string }) => {
      sheets.push(params.sheet);
      return base.readRows(params);
    },
  } as never);
  assert.equal(sheets.includes("COMPETITIONS_PARTICIPANTS_MEMBRES"), false);
});

test("les participants utilisent le cache Sheets de secours en cas de quota", async () => {
  const setup = fixture();
  const base = setup.deps as unknown as { readRows: (params: { sheet: string; fresh?: boolean }) => Promise<SheetRow[]> };
  const calls: Array<{ sheet: string; fresh?: boolean }> = [];
  await getCompetitionPeople("COMP-1", {
    ...base,
    readRows: async (params: { sheet: string; fresh?: boolean }) => {
      calls.push(params);
      return base.readRows(params);
    },
  } as never);
  assert.equal(calls.filter((call) => call.sheet.startsWith("COMPETITIONS_") || call.sheet === "COMPETITIONS").some((call) => call.fresh), false);
});

test("propose les athlètes affiliés et enrichit les autres registres", async () => {
  const result = await getCompetitionPeople("COMP-1", fixture({ COMPETITIONS_PARTICIPANTS_MEMBRES: [] }).deps);
  assert.deepEqual({ nom: result.available.athletes[0].nom, equipe: result.available.athletes[0].equipe }, { nom: "Jean Test", equipe: "Matonge Senior" });
  assert.equal(result.available.medecins[0].detail, "Urgentiste");
  assert.equal(result.available.arbitres[0].grade, "National");
  assert.equal(result.available.arbitres[0].numeroLicence, "3802");
  assert.equal(result.available.arbitres[0].statutParticipation, "VALIDE");
});

test("enregistre un officiel sans écrire les données calculées", async () => {
  const setup = fixture();
  await addCompetitionPerson("COMP-1", { category: "officiels", actorId: "OFF1", role: "Commissaire de match" }, setup.deps);
  assert.equal(setup.writes[0].sheet, "COMPETITIONS_INTERVENANTS");
  assert.equal(setup.writes[0].values.type_participant, "OFFICIEL");
  assert.equal(setup.writes[0].values.role_participant, "");
  assert.equal(Object.hasOwn(setup.writes[0].values, "statut_participation"), false);
  assert.equal(Object.hasOwn(setup.writes[0].values, "numero_licence"), false);
  assert.match(setup.writes[0].values.id_intervenant_competition, /^BKB-INV-COMP-1-\d{3}$/);
});

test("refuse un athlète sans affiliation active dans une équipe engagée", async () => {
  const setup = fixture({ COMPETITIONS_PARTICIPANTS_MEMBRES: [], ATHLETE_AFFILIATIONS: [{ id_athlete: "ATH1", id_equipe: "E1", id_statut_affiliation: "INACTIF" }] });
  await assert.rejects(addCompetitionPerson("COMP-1", { category: "athletes", actorId: "ATH1" }, setup.deps), /pas disponible/);
});

test("retire des choix une personne déjà ajoutée dans sa catégorie", async () => {
  const setup = fixture({ COMPETITIONS_INTERVENANTS: [{ id_intervenant_competition: "I1", id_competition: "COMP-1", type_participant: "OFFICIEL", id_acteur: "OFF1", role_participant: "Commissaire", statut: "ACTIF" }] });
  const result = await getCompetitionPeople("COMP-1", setup.deps);
  assert.deepEqual(result.available.officiels, []);
  assert.equal(result.officiels[0].role, "");
});

test("conserve le rôle manuel d'un autre acteur dans role_participant", async () => {
  const setup = fixture();
  await addCompetitionPerson("COMP-1", { category: "autres", actorId: "AUT1", role: "  Responsable   logistique  " }, setup.deps);
  assert.equal(setup.writes[0].values.role_participant, "Responsable logistique");
  assert.equal(setup.writes[0].values.id_type_acteur, "TAC099");
});

test("charge chaque feuille de licences une seule fois sans requête par intervenant", async () => {
  const setup = fixture();
  const base = setup.deps as unknown as { readRows: (params: { sheet: string }) => Promise<SheetRow[]> };
  const calls: string[] = [];
  await getCompetitionPeople("COMP-1", { ...base, readRows: async (params: { sheet: string }) => { calls.push(params.sheet); return base.readRows(params); } } as never);
  assert.equal(calls.filter((sheet) => sheet === "ATHLETE_LICENCES").length, 1);
  assert.equal(calls.filter((sheet) => sheet === "ACTEURS_LICENCES").length, 1);
});

test("l'interface adapte colonnes, aperçu et filtre sans bloquer une licence invalide", async () => {
  const source = await import("node:fs/promises").then((fs) => fs.readFile("components/dashboard/competition-people-panel.tsx", "utf8"));
  assert.match(source, /Statut de participation/);
  assert.match(source, /Numéro de licence/);
  assert.match(source, /Grade/);
  assert.match(source, /Rôle dans la compétition/);
  assert.match(source, /L’intervenant peut néanmoins être ajouté/);
  assert.doesNotMatch(source, /disabled=\{[^}]*statutParticipation/);
  assert.match(source, /validityFilter/);
});
