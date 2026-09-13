import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("la navigation conserve uniquement Licences sous Mouvement", async () => {
  const source = await readFile("components/dashboard/sidebar.tsx", "utf8");
  const movement = source.match(/const navigationMouvement[\s\S]*?\n\]/)?.[0] || "";
  const competition = source.match(/const navigationCompetition[\s\S]*?\n\]/)?.[0] || "";
  assert.match(movement, /\/dashboard\/licences/);
  assert.doesNotMatch(competition, /licences/);
  assert.match(source, /title="Mouvement"/);
});

test("la page Licences expose la consultation et le renouvellement", async () => {
  const source = await readFile("app/dashboard/licences/page.tsx", "utf8");
  assert.match(source, /title="Licences des athlètes"/);
  assert.match(source, /Renouveler par équipe/);
  assert.match(source, /LicenceEditor/);
});
