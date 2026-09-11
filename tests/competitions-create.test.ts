import assert from "node:assert/strict";
import test from "node:test";
import {
  createCompetition,
  generateCompetitionId,
  getCompetitionReferences,
  updateCompetition,
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

test("classe les saisons réelles de la plus récente à la plus ancienne", async () => {
  const refs = await getCompetitionReferences({ readRows: async ({ sheet }: { sheet: string }) => sheet === "SAISON" ? [{ id_saison: "SAI005", nom_saison: "2025" }, { id_saison: "SAI007", nom_saison: "2027" }] : references[sheet] || [], writeRow: async () => ({}) } as never);
  assert.deepEqual(refs.seasons.map((item) => item.id), ["SAI007", "SAI005"]);
});

test("modifie exactement la compétition ciblée sans changer son identifiant", async () => {
  let writtenId = "", mode = "";
  const deps = { readRows: async ({ sheet }: { sheet: string }) => sheet === "COMPETITIONS" ? [{ id_competition: "COMP-1", nom_competition: "Ancien" }] : references[sheet] || [], writeRow: async (input: { id: string; mode: string; values: SheetRow }) => { writtenId = input.id; mode = input.mode; return { id_competition: input.id, ...input.values }; } } as never;
  const updated = await updateCompetition("COMP-1", { nom_competition: "Nouveau", id_type_competition: "TC001", id_discipline: "DIS001", id_saison: "SAI006", date_debut: "2026-09-01", date_fin: "2026-09-10", pays: "RDC", statut: "PLANIFIEE", observations: "" }, deps);
  assert.equal(writtenId, "COMP-1"); assert.equal(mode, "update"); assert.equal(updated.id, "COMP-1");
});

test("la fiche expose six onglets pleine largeur avec une URL stable", async () => {
  const source = await import("node:fs/promises").then((fs) => fs.readFile("app/dashboard/competitions/[id]/page.tsx", "utf8"));
  for (const tab of ["general", "participants", "phases", "matchs", "resultats", "classement"]) assert.match(source, new RegExp(`value=\\"${tab}\\"`));
  assert.match(source, /w-full grid-cols-2/);
  assert.match(source, /router\.push\(`\$\{pathname\}\?tab=\$\{tab\}`\)/);
  assert.match(source, /Bientôt disponible/);
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
