import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("les mutations de licences exigent le rôle fédéral côté serveur", async () => {
  const [renew, update] = await Promise.all([
    readFile("app/api/licences/renouveler/route.ts", "utf8"),
    readFile("app/api/licences/[id]/route.ts", "utf8"),
  ]);
  for (const source of [renew, update]) {
    assert.match(source, /getSessionUser/);
    assert.match(source, /user\.role !== "federal"/);
    assert.match(source, /status: 403/);
  }
});

test("l'éditeur couvre l'enregistrement individuel, le renouvellement collectif et la consultation", async () => {
  const source = await readFile("components/dashboard/licence-editor.tsx", "utf8");
  assert.match(source, /"ATHLETE"\|"EQUIPE"/);
  assert.match(source, /Enregistrer une licence/);
  assert.match(source, /Renouveler les licences d’une équipe/);
  assert.match(source, /Consulter la licence/);
  assert.match(source, /Tout sélectionner/);
  assert.match(source, /x\.situation/);
  assert.match(source, /Première licence à enregistrer individuellement/);
  assert.match(source, /if\(saving\|\|readOnly\)return/);
  assert.match(source, /disabled=\{readOnly\}/);
});

test("la page masque les actions d'écriture aux rôles non fédéraux et rend des cartes mobiles", async () => {
  const source = await readFile("app/dashboard/licences/page.tsx", "utf8");
  assert.match(source, /setFederal\(p\?\.user\?\.role==="federal"\)/);
  assert.match(source, /\{federal\?/);
  assert.match(source, /renderMobileCard/);
  assert.match(source, /Réessayer/);
  assert.match(source, /readOnly=\{editorReadOnly\}/);
});

test("les nouvelles écritures ciblent uniquement les huit colonnes ATHLETE_LICENCES", async () => {
  const source = await readFile("lib/licences.ts", "utf8");
  for (const header of ["id_licence", "id_athlete", "id_saison", "id_affiliation_athlete", "numero_licence", "date_delivrance", "id_statut_licence", "observations"]) assert.match(source, new RegExp(header));
  assert.doesNotMatch(source, /date_debut_validite|date_fin_validite|id_cycle_licence/);
});
