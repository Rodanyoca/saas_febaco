import assert from "node:assert/strict";
import test from "node:test";
import {
  createCompetition,
  generateCompetitionId,
  validateCompetitionInput,
} from "../lib/competitions";
import type { SheetRow } from "../lib/google-sheets";

const references: Record<string, SheetRow[]> = {
  TYPES_COMPETITIONS: [
    { id_type_competition: "TC001", nom_type_competition: "CHAMPIONNAT" },
  ],
  DISCIPLINES: [{ id_discipline: "DIS001", nom_discipline: "BASKETBALL_5X5" }],
  SAISON: [{ id_saison: "SAI006", nom_saison: "2026" }],
};

test("génère un identifiant de compétition stable par saison", () => {
  assert.equal(
    generateCompetitionId([{ id_competition: "BKB-COMP-2026-002" }], "2026"),
    "BKB-COMP-2026-003",
  );
});

test("refuse une période inversée", () => {
  const result = validateCompetitionInput({
    date_debut: "2026-09-10",
    date_fin: "2026-09-01",
  });
  assert.match(result.errors.date_fin, /précéder/);
});

test("crée uniquement une ligne COMPETITIONS avec des identifiants de référentiel", async () => {
  let rows: SheetRow[] = [],
    writes = 0;
  const deps = {
    readRows: async ({ sheet }: { sheet: string }) =>
      sheet === "COMPETITIONS" ? rows : references[sheet] || [],
    writeRow: async ({ id, values }: { id: string; values: SheetRow }) => {
      writes++;
      const row = { id_competition: id, ...values };
      rows = [...rows, row];
      return row;
    },
  } as never;
  const created = await createCompetition(
    {
      nom_competition: "Coupe test",
      id_type_competition: "TC001",
      id_discipline: "DIS001",
      id_saison: "SAI006",
      date_debut: "2026-09-01",
      date_fin: "2026-09-10",
      pays: "RDC",
      statut: "PLANIFIEE",
      observations: "",
    },
    deps,
  );
  assert.equal(writes, 1);
  assert.equal(created.id, "BKB-COMP-2026-001");
  assert.equal(created.pays, "RDC");
});
