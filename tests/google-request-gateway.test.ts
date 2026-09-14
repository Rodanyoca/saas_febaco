import assert from "node:assert/strict";
import test from "node:test";

import {
  GoogleRequestError,
  executeGoogleRequest,
  getGoogleRequestMetrics,
  resetGoogleRequestStateForTests,
} from "../lib/google-request";

test("réessaie une lecture 429 avec un délai borné", async () => {
  resetGoogleRequestStateForTests();
  let attempts = 0;
  const delays: number[] = [];
  const value = await executeGoogleRequest({
    provider: "sheets",
    module: "tests",
    operation: "values.get",
    access: "read",
    maxRetries: 2,
    sleep: async (ms) => { delays.push(ms); },
    random: () => 0,
    run: async () => {
      attempts += 1;
      if (attempts === 1) throw Object.assign(new Error("quota exceeded"), { code: 429 });
      return "ok";
    },
  });
  assert.equal(value, "ok");
  assert.equal(attempts, 2);
  assert.equal(delays.length, 1);
  assert.ok(delays[0] >= 0 && delays[0] <= 2_000);
});

test("ne réessaie pas une écriture non idempotente", async () => {
  resetGoogleRequestStateForTests();
  let attempts = 0;
  await assert.rejects(
    executeGoogleRequest({
      provider: "drive",
      module: "tests",
      operation: "files.create",
      access: "write",
      idempotent: false,
      maxRetries: 3,
      sleep: async () => {},
      run: async () => {
        attempts += 1;
        throw Object.assign(new Error("backend error"), { code: 503 });
      },
    }),
    GoogleRequestError,
  );
  assert.equal(attempts, 1);
});

test("reconnaît le quota Drive signalé en 403", async () => {
  let attempts = 0;
  await executeGoogleRequest({ provider: "drive", module: "tests", operation: "files.get", access: "read", maxRetries: 1, sleep: async () => {}, run: async () => {
    attempts += 1;
    if (attempts === 1) throw Object.assign(new Error("userRateLimitExceeded"), { code: 403 });
    return true;
  }});
  assert.equal(attempts, 2);
});

test("honore Retry-After et expose des métriques agrégées sans données métier", async () => {
  resetGoogleRequestStateForTests();
  const delays: number[] = [];
  let attempts = 0;
  await executeGoogleRequest({
    provider: "sheets",
    module: "competitions",
    operation: "values.batchGet",
    access: "read",
    sleep: async (ms) => { delays.push(ms); },
    run: async () => {
      attempts += 1;
      if (attempts === 1) throw { response: { status: 503, headers: { "retry-after": "1" } } };
      return true;
    },
  });
  assert.equal(delays[0], 1_000);
  const metrics = getGoogleRequestMetrics();
  assert.equal(metrics.total, 2);
  assert.equal(metrics.retries, 1);
  assert.equal(metrics.failures, 1);
  assert.ok(metrics.byOperation["sheets:values.batchGet"]);
});

test("borne la concurrence des lectures Google", async () => {
  resetGoogleRequestStateForTests();
  let active = 0;
  let peak = 0;
  let release: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const jobs = Array.from({ length: 8 }, (_, index) => executeGoogleRequest({
    provider: "sheets", module: "tests", operation: `read-${index}`, access: "read",
    run: async () => { active += 1; peak = Math.max(peak, active); await gate; active -= 1; return index; },
  }));
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.ok(peak <= 3);
  release?.();
  assert.deepEqual(await Promise.all(jobs), [0, 1, 2, 3, 4, 5, 6, 7]);
});
