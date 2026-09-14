import assert from "node:assert/strict";
import test from "node:test";

test("les clients Google sont centralisés hors des adaptateurs métier", async () => {
  const fs = await import("node:fs/promises");
  const sheets = await fs.readFile("lib/google-sheets.ts", "utf8");
  const drive = await fs.readFile("lib/google-drive.ts", "utf8");
  const media = await fs.readFile("app/api/media/drive/route.ts", "utf8");
  assert.doesNotMatch(sheets, /from ["']googleapis["']/);
  assert.doesNotMatch(drive, /from ["']googleapis["']/);
  assert.match(media, /readDriveMedia/);
  assert.doesNotMatch(media, /drive\.files\.get/);
});

