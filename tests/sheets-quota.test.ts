import assert from "node:assert/strict";
import test from "node:test";

import { canonicalizeReadRange } from "../lib/google-sheets";

test("déduplique les lectures territoriales quelle que soit la plage demandée", () => {
  assert.equal(canonicalizeReadRange("structure", "LIGUES", "A:K"), "A:ZZ");
  assert.equal(canonicalizeReadRange("structure", "ligues", "A:ZZ"), "A:ZZ");
  assert.equal(canonicalizeReadRange("structure", "CLUBS", "A:P"), "A:ZZ");
});

test("déduplique aussi les référentiels et compétitions quelle que soit la plage", () => {
  assert.equal(canonicalizeReadRange("referentiel", "CATEGORIES_AGE", "A:F"), "A:ZZ");
  assert.equal(canonicalizeReadRange("referentiel", "CATEGORIES_AGE", "A:ZZ"), "A:ZZ");
  assert.equal(canonicalizeReadRange("competitions", "COMPETITIONS_PHASES", "A:I"), "A:ZZ");
  assert.equal(canonicalizeReadRange("competitions", "COMPETITIONS_PHASES", "A:ZZ"), "A:ZZ");
});

test("déduplique aussi deux lectures fraîches simultanées", async () => {
  const source = await import("node:fs/promises").then((fs) => fs.readFile("lib/google-sheets.ts", "utf8"));
  assert.match(source, /const pending = pendingReads\.get\(cacheKey\)/);
  assert.doesNotMatch(source, /const pending = params\.fresh \? undefined : pendingReads\.get\(cacheKey\)/);
});

test("dispose d'un classeur canonique pour le bloc compétitions en production", async () => {
  const source = await import("node:fs/promises").then((fs) => fs.readFile("lib/google-sheets.ts", "utf8"));
  assert.match(source, /spreadsheetFallbackByBlock/);
  assert.match(source, /competitions:\s*"[A-Za-z0-9_-]+"/);
});

test("la liste des équipes reste disponible si un libellé référentiel est sous quota", async () => {
  const source = await import("node:fs/promises").then((fs) => fs.readFile("app/api/equipes/route.ts", "utf8"));
  assert.match(source, /optionalReferenceMap\("CATEGORIES_AGE"\)/);
  assert.match(source, /return new Map<string, string>\(\)/);
});

test("une lecture fraîche remplace aussi la valeur du cache partagé", async () => {
  const source = await import("node:fs/promises").then((fs) => fs.readFile("lib/google-sheets.ts", "utf8"));
  assert.doesNotMatch(source, /if \(!params\.fresh\)\s*readCache\.set/);
  assert.match(source, /readCache\.set\(cacheKey/);
});
