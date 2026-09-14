import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("la navigation regroupe les licences des Athlètes et annonce Entourage", async () => {
  const source = await readFile("components/dashboard/sidebar.tsx", "utf8");
  const licences = source.match(/const navigationLicences[\s\S]*?\n\]/)?.[0] || "";
  const competition = source.match(/const navigationCompetition[\s\S]*?\n\]/)?.[0] || "";
  assert.match(licences, /name: "Athlètes", href: "\/dashboard\/licences"/);
  assert.match(licences, /name: "Entourage"[\s\S]*disabled: true[\s\S]*badge: "Bientôt"/);
  assert.doesNotMatch(competition, /licences/);
  assert.match(source, /title="Licences"/);
  assert.match(source, /aria-disabled="true"/);
});

test("la page Licences expose la consultation et le renouvellement", async () => {
  const source = await readFile("app/dashboard/licences/page.tsx", "utf8");
  assert.match(source, /title="Licences des athlètes"/);
  assert.match(source, /Renouveler par équipe/);
  assert.match(source, /LicenceEditor/);
});
