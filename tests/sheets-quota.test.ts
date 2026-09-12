import assert from "node:assert/strict";
import test from "node:test";

import { canonicalizeReadRange } from "../lib/google-sheets";

test("déduplique les lectures territoriales quelle que soit la plage demandée", () => {
  assert.equal(canonicalizeReadRange("structure", "LIGUES", "A:K"), "A:ZZ");
  assert.equal(canonicalizeReadRange("structure", "ligues", "A:ZZ"), "A:ZZ");
  assert.equal(canonicalizeReadRange("structure", "CLUBS", "A:P"), "A:ZZ");
});

test("conserve les plages précises des autres classeurs", () => {
  assert.equal(
    canonicalizeReadRange("referentiel", "PROVINCES", "A:F"),
    "A:F",
  );
});

test("déduplique aussi deux lectures fraîches simultanées", async () => {
  const source = await import("node:fs/promises").then((fs) => fs.readFile("lib/google-sheets.ts", "utf8"));
  assert.match(source, /const pending = pendingReads\.get\(cacheKey\)/);
  assert.doesNotMatch(source, /const pending = params\.fresh \? undefined : pendingReads\.get\(cacheKey\)/);
});
