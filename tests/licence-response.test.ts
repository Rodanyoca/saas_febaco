import test from "node:test";
import assert from "node:assert/strict";
import { licenceFailure } from "../app/api/licences/_response";
import { GoogleRequestError } from "../lib/google-request";

test("une panne Google des licences renvoie 503 sans exposer la cause", async () => {
  const response = licenceFailure(new GoogleRequestError("TIMEOUT", "Le service Google met trop de temps à répondre.", 503, true, new Error("synthetic-private-detail")));
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.error.code, "TIMEOUT");
  assert.ok(!JSON.stringify(body).includes("synthetic-private-detail"));
});
