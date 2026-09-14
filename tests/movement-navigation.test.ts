import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("la navigation regroupe les licences des Athlètes et de l'Entourage", async () => {
  const source = await readFile("components/dashboard/sidebar.tsx", "utf8");
  const licences = source.match(/const navigationLicences[\s\S]*?\n\]/)?.[0] || "";
  const competition = source.match(/const navigationCompetition[\s\S]*?\n\]/)?.[0] || "";
  assert.match(licences, /name: "Athlètes", href: "\/dashboard\/licences"/);
  assert.match(licences, /name: "Entourage", href: "\/dashboard\/licences\/entourage"/);
  assert.match(licences, /href: "\/dashboard\/licences", icon: CreditCard, exact: true/);
  assert.match(source, /!item\.exact && pathname\.startsWith/);
  assert.doesNotMatch(competition, /licences/);
  assert.match(source, /title="Licences"/);
});

test("les actions des licences entourage sont regroupées dans un menu compact", async () => {
  const source = await readFile("app/dashboard/licences/entourage/page.tsx", "utf8");
  assert.match(source, /<DropdownMenuTrigger asChild>/);
  assert.match(source, /<MoreHorizontal \/>/);
  assert.match(source, /<DropdownMenuContent side="top"/);
  assert.doesNotMatch(source, /const actions = .*flex flex-wrap justify-center gap-1/);
});

test("la page Licences expose la consultation et le renouvellement", async () => {
  const source = await readFile("app/dashboard/licences/page.tsx", "utf8");
  assert.match(source, /title="Licences des athlètes"/);
  assert.match(source, /Renouveler par équipe/);
  assert.match(source, /LicenceEditor/);
});
