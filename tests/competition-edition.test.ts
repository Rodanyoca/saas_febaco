import assert from "node:assert/strict";
import test from "node:test";
import { readFile, access } from "node:fs/promises";
import { requireCompetitionEdition } from "../lib/competition-edition";
test("le statut ne verrouille plus l'édition, mais une compétition inconnue est refusée", () => {
  for (const statut of ["EN_COURS", "TERMINEE", "ANNULEE", "PLANIFIEE"]) assert.equal(requireCompetitionEdition([{ id_competition: "C1", statut }], "C1").statut, statut);
  assert.throws(() => requireCompetitionEdition([], "C1"), /n’existe pas/);
});
test("la clôture et la progression sont retirées de la fiche et du code dédié", async () => {
  const page = await readFile("app/dashboard/competitions/[id]/page.tsx", "utf8");
  assert.doesNotMatch(page, /CompetitionProgress|closed|readOnly|\/close/);
  assert.match(page, /label:"Phases"/); assert.match(page, /label:"Classement"/);
  await assert.rejects(access("app/api/competitions/[id]/close/route.ts"));
  await assert.rejects(access("components/dashboard/competition-progress.tsx"));
});
