import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("l'API Ententes résout la ville depuis id_ville", async () => {
  const source = await readFile("app/api/ententes/route.ts", "utf8");
  assert.match(source, /getReferenceMap\("VILLES"\)/);
  assert.match(source, /villeId/);
  assert.match(source, /ville:/);
});

test("la fiche Ligue affiche la ville des clubs et explicite une catégorie d'athlète absente", async () => {
  const page = await readFile("app/dashboard/ligues/[id]/page.tsx", "utf8");
  const clubsApi = await readFile("app/api/clubs/route.ts", "utf8");
  assert.match(page, /key: "ville", header: "Ville"/);
  assert.doesNotMatch(page, /key: "province", header: "Province"/);
  assert.match(page, /athlete\.categorie\s*\|\|\s*"Non définie"/);
  assert.match(clubsApi, /getReferenceMap\("VILLES"\)/);
  assert.match(clubsApi, /ville:/);
});

test("la fiche Ligue calcule ses villes depuis les ententes liées", async () => {
  const source = await readFile("app/dashboard/ligues/[id]/page.tsx", "utf8");
  assert.match(source, /const relatedCities = useMemo/);
  assert.match(source, /label: "Ville"/);
  assert.match(source, /value: relatedCities/);
  assert.doesNotMatch(source, /label: "Province", value: ligue\.province/);
});
