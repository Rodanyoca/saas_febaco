import assert from "node:assert/strict";
import test from "node:test";
import { addCompetitionPerson, getCompetitionPeople } from "../lib/competition-people";
import type { SheetRow } from "../lib/google-sheets";

function fixture(overrides: Record<string, SheetRow[]> = {}) {
  const sheets: Record<string, SheetRow[]> = {
    COMPETITIONS: [{ id_competition: "COMP-1" }],
    COMPETITIONS_PARTICIPANTS: [{ id_participation: "P1", id_competition: "COMP-1", id_equipe: "E1" }],
    COMPETITIONS_PARTICIPANTS_MEMBRES: [{ id_participation_membre: "PM1", id_participation: "P1", id_athlete: "ATH1", id_poste: "POS1", numero_maillot: "7" }, { id_participation_membre: "PM2", id_participation: "OTHER", id_athlete: "ATH2" }], COMPETITIONS_INTERVENANTS: [],
    EQUIPES: [{ id_equipe: "E1", nom_equipe: "Matonge Senior", id_club: "C1" }], CLUBS: [{ id_club: "C1", nom_club: "Matonge" }],
    ATHLETES: [{ id_athlete: "ATH1", nom_complet: "Jean Test" }, { id_athlete: "ATH2", nom_complet: "Hors compétition" }],
    ARBITRES: [{ id_arbitre: "ARB1", nom_complet: "Arbitre non affecté", id_grade_arbitre: "G1" }], OFFICIELS: [{ id_officiel: "OFF1", nom_complet: "Officiel Club" }], MEDECINS: [{ id_medecin: "MED1", nom_complet: "Docteur Club", id_specialite: "S1" }], AUTRES: [],
    ATHLETE_AFFILIATIONS: [{ id_athlete: "ATH1", id_equipe: "E1", id_statut_affiliation: "SAF001" }],
    MEDECINS_AFFILIATIONS: [{ id_medecin: "MED1", id_equipe: "E1", id_statut_affiliation: "SAF001" }],
    OFFICIELS_AFFILIATIONS: [{ id_officiel: "OFF1", id_fonction: "F1", id_type_entite: "STR003", id_entite: "C1", id_statut_affiliation: "SAF001" }], AUTRES_AFFILIATIONS: [],
    FONCTIONS: [{ id_fonction: "F1", nom_fonction: "Manager" }], GRADES_ARBITRES: [{ id_grade_arbitre: "G1", nom_grade_arbitre: "National" }], SPECIALITES_MEDECINS: [{ id_specialite: "S1", nom_specialite: "Urgentiste" }], TYPES_AUTRES_ACTEURS: [],
    ...overrides,
  };
  let writes: Array<{ sheet: string; values: Record<string, string> }> = [];
  return { deps: { readRows: async ({ sheet }: { sheet: string }) => sheets[sheet] || [], appendRows: async ({ rows }: { rows: typeof writes }) => { writes = rows; } } as never, get writes() { return writes; } };
}

test("liste uniquement les athlètes explicitement inscrits à la compétition", async () => {
  const result = await getCompetitionPeople("COMP-1", fixture().deps);
  assert.deepEqual(result.athletes.map((person) => person.id), ["ATH1"]);
  assert.deepEqual({ club: result.athletes[0].club, equipe: result.athletes[0].equipe, detail: result.athletes[0].detail }, { club: "Matonge", equipe: "Matonge Senior", detail: "Maillot 7" });
});

test("propose les athlètes affiliés et les rôles adaptés des autres registres", async () => {
  const result = await getCompetitionPeople("COMP-1", fixture({ COMPETITIONS_PARTICIPANTS_MEMBRES: [] }).deps);
  assert.deepEqual({ nom: result.available.athletes[0].nom, equipe: result.available.athletes[0].equipe }, { nom: "Jean Test", equipe: "Matonge Senior" });
  assert.equal(result.available.medecins[0].detail, "Urgentiste");
  assert.equal(result.available.arbitres[0].role, "National");
});

test("enregistre un officiel avec son rôle propre à la compétition", async () => {
  const setup = fixture();
  await addCompetitionPerson("COMP-1", { category: "officiels", actorId: "OFF1", role: "Commissaire de match" }, setup.deps);
  assert.equal(setup.writes[0].sheet, "COMPETITIONS_INTERVENANTS");
  assert.equal(setup.writes[0].values.type_participant, "OFFICIEL");
  assert.equal(setup.writes[0].values.role_participant, "Commissaire de match");
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
  assert.equal(result.officiels[0].role, "Commissaire");
});
