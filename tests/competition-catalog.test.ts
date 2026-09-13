import assert from "node:assert/strict";
import test from "node:test";
import { createCompetitionEventTable, listCompetitionCatalog, updateCompetitionEventTable } from "../lib/competition-catalog";
import type { SheetRow } from "../lib/google-sheets";

function fixture(overrides: Record<string, SheetRow[]> = {}) {
  const sheets: Record<string, SheetRow[]> = {
    COMPETITIONS: [{ id_competition: "BKB-COMP-2026-001", numero_edition: "43", nom_competition: "43e Coupe du Congo", id_type_competition: "TC003", id_discipline: "DIS001", id_saison: "SAI006", date_debut: "2026-09-17", date_fin: "2026-09-27", pays: "RDC", lieu: "Kinshasa", statut: "PLANIFIEE" }],
    COMPETITIONS_EPREUVES: [], COMPETITIONS_UNITES: [], COMPETITIONS_PHASES: [], COMPETITIONS_MATCHS: [],
    TYPES_COMPETITIONS: [{ id_type_competition: "TC003", nom_type_competition: "Coupe" }], DISCIPLINES: [{ id_discipline: "DIS001", nom_discipline: "Basketball" }], SAISON: [{ id_saison: "SAI006", nom_saison: "2026" }], CATEGORIES_AGE: [{ id_categorie_age: "AGE001", nom_categorie_age: "Senior" }], SEXES: [{ id_sexe: "SEX001", nom_sexe: "Masculin" }],
    ...overrides,
  };
  const writes: Array<{ sheet: string; id: string; idHeader: string; values: Record<string, string>; mode: string }> = [];
  return { deps: { readRows: async ({ sheet }: { sheet: string }) => sheets[sheet] || [], writeRow: async (args: typeof writes[number]) => { writes.push(args); return args.values; } } as never, writes };
}

test("le catalogue lit directement les compétitions réelles", async () => {
  const data = await listCompetitionCatalog(fixture().deps);
  assert.equal(data.competitions[0].id, "BKB-COMP-2026-001");
  assert.equal(data.competitions[0].lieu, "Kinshasa");
  assert.equal(data.competitions[0].numeroEdition, "43");
});

test("relit COMPETITIONS depuis Sheets pour refléter les modifications manuelles", async () => {
  const reads: Array<{ sheet: string; fresh?: boolean }> = [];
  await listCompetitionCatalog({ readRows: async (params: { sheet: string; fresh?: boolean }) => { reads.push(params); return []; }, writeRow: async () => ({}) } as never);
  assert.equal(reads.find((read) => read.sheet === "COMPETITIONS")?.fresh, true);
});

test("le modèle et les routes n’utilisent aucune compétition permanente", async () => {
  const fs = await import("node:fs/promises");
  const sources = await Promise.all([fs.readFile("app/api/competitions/route.ts", "utf8"), fs.readFile("lib/competition-catalog.ts", "utf8"), fs.readFile("app/dashboard/competitions/page.tsx", "utf8"), fs.readFile("lib/competitions.ts", "utf8"), fs.readFile("lib/models.ts", "utf8")]);
  assert.match(sources[0], /createCompetition/);
  assert.doesNotMatch(sources.join("\n"), /COMPETITIONS_PERMANENTES|id_competition_permanente|permanentId|createCompetitionEvent\(/);
});

test("crée une épreuve reliée à la compétition par id_competition", async () => {
  const setup = fixture();
  await createCompetitionEventTable("BKB-COMP-2026-001", { nomEpreuve: "Senior masculin", disciplineId: "DIS001", categorieId: "AGE001", sexeId: "SEX001", statut: "ACTIF" }, setup.deps);
  assert.deepEqual({ sheet: setup.writes[0].sheet, idHeader: setup.writes[0].idHeader, id: setup.writes[0].id, competitionId: setup.writes[0].values.id_competition }, { sheet: "COMPETITIONS_EPREUVES", idHeader: "id_epreuve_competition", id: "BKB-EPR-2026-001-001", competitionId: "BKB-COMP-2026-001" });
});

test("modifie une épreuve sans modifier son identifiant", async () => {
  const setup = fixture({ COMPETITIONS_EPREUVES: [{ id_epreuve_competition: "E1", id_competition: "BKB-COMP-2026-001", nom_epreuve: "Ancien", statut: "ACTIF" }] });
  await updateCompetitionEventTable("BKB-COMP-2026-001", "E1", { id_epreuve_competition: "AUTRE", nomEpreuve: "Nouveau", statut: "INACTIF" }, setup.deps);
  assert.equal(setup.writes[0].id, "E1"); assert.equal(setup.writes[0].mode, "update"); assert.equal(setup.writes[0].values.nom_epreuve, "Nouveau");
});
