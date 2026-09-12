import assert from "node:assert/strict";
import test from "node:test";
import { createCompetitionEvent, createCompetitionEventTable, createPermanentCompetition, listCompetitionCatalog, updateCompetitionEventTable } from "../lib/competition-catalog";
import type { SheetRow } from "../lib/google-sheets";

function fixture(overrides: Record<string, SheetRow[]> = {}) {
  const sheets: Record<string, SheetRow[]> = {
    COMPETITIONS_PERMANENTES: [{ id_competition_permanente: "BKB-CPT-001", nom_competition: "Coupe du Congo", id_type_competition: "TC003", id_discipline: "DIS001", statut: "ACTIF" }],
    COMPETITIONS: [{ id_competition: "BKB-COMP-2026-001", id_competition_permanente: "BKB-CPT-001", numero_edition: "43", nom_competition: "43e Coupe du Congo", id_type_competition: "TC003", id_discipline: "DIS001", id_saison: "SAI006", date_debut: "2026-09-17", date_fin: "2026-09-27", pays: "RDC", lieu: "Kinshasa", statut: "PLANIFIEE" }],
    COMPETITIONS_EPREUVES: [], TYPES_COMPETITIONS: [{ id_type_competition: "TC003", nom_type_competition: "Coupe" }], DISCIPLINES: [{ id_discipline: "DIS001", nom_discipline: "Basketball" }], SAISON: [{ id_saison: "SAI006", nom_saison: "2026" }], CATEGORIES_AGE: [{ id_categorie_age: "AGE001", nom_categorie_age: "Senior" }], SEXES: [{ id_sexe: "SEX001", nom_sexe: "Masculin" }],
    ...overrides,
  };
  const writes: Array<{ sheet: string; id: string; values: Record<string, string>; mode: string }> = [];
  return { deps: { readRows: async ({ sheet }: { sheet: string }) => sheets[sheet] || [], writeRow: async (args: typeof writes[number]) => { writes.push(args); return args.values; } } as never, writes };
}

test("le catalogue sépare les compétitions permanentes de leurs éditions", async () => {
  const data = await listCompetitionCatalog(fixture().deps);
  assert.equal(data.permanents[0].id, "BKB-CPT-001");
  assert.equal(data.editions[0].permanentId, "BKB-CPT-001");
  assert.equal(data.editions[0].lieu, "Kinshasa");
});

test("relit les éditions directement depuis Sheets pour refléter les modifications manuelles", async () => {
  const reads: Array<{ sheet: string; fresh?: boolean }> = [];
  await listCompetitionCatalog({
    readRows: async (params: { sheet: string; fresh?: boolean }) => { reads.push(params); return []; },
    writeRow: async () => ({}),
  } as never);
  assert.equal(reads.find((read) => read.sheet === "COMPETITIONS")?.fresh, true);
});

test("crée une compétition permanente avec un identifiant stable", async () => {
  const setup = fixture();
  await createPermanentCompetition({ nomCompetition: "Championnat national", typeId: "TC003", disciplineId: "DIS001", statut: "ACTIF" }, setup.deps);
  assert.deepEqual({ sheet: setup.writes[0].sheet, id: setup.writes[0].id }, { sheet: "COMPETITIONS_PERMANENTES", id: "BKB-CPT-002" });
});

test("refuse une édition sans compétition permanente existante", async () => {
  await assert.rejects(createCompetitionEvent({ permanentId: "BKB-CPT-999", nomCompetition: "Édition", disciplineId: "DIS001", saisonId: "SAI006", dateDebut: "2026-01-01", dateFin: "2026-01-02", pays: "RDC", lieu: "Kinshasa", statut: "PLANIFIEE" }, fixture().deps), /permanente/i);
});

test("crée une épreuve dans une édition avec ses références sportives", async () => {
  const setup = fixture();
  await createCompetitionEventTable("BKB-COMP-2026-001", { nomEpreuve: "Senior masculin", disciplineId: "DIS001", categorieId: "AGE001", sexeId: "SEX001", statut: "ACTIF" }, setup.deps);
  assert.deepEqual({ sheet: setup.writes[0].sheet, id: setup.writes[0].id, competitionId: setup.writes[0].values.id_competition }, { sheet: "COMPETITIONS_EPREUVES", id: "BKB-EPR-2026-001-001", competitionId: "BKB-COMP-2026-001" });
});

test("modifie le libellé et le statut d’une épreuve sans modifier son identifiant",async()=>{const setup=fixture({COMPETITIONS_EPREUVES:[{id_epreuve_competition:"E1",id_competition:"BKB-COMP-2026-001",nom_epreuve:"Ancien",statut:"ACTIF"}]});await updateCompetitionEventTable("BKB-COMP-2026-001","E1",{id_epreuve_competition:"AUTRE",nomEpreuve:"Nouveau",statut:"INACTIF"},setup.deps);assert.equal(setup.writes[0].id,"E1");assert.equal(setup.writes[0].mode,"update");assert.equal(setup.writes[0].values.nom_epreuve,"Nouveau")});
