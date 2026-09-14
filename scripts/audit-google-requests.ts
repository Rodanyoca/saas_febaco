import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const roots = ["app", "components", "hooks", "lib"].filter(Boolean);
const extensions = new Set([".ts", ".tsx", ".js", ".jsx"]);

async function filesUnder(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  const nested = await Promise.all(entries.map((entry) => {
    const target = path.join(root, entry.name);
    return entry.isDirectory() ? filesUnder(target) : extensions.has(path.extname(entry.name)) ? [target] : [];
  }));
  return nested.flat();
}

const count = (source: string, pattern: RegExp) => [...source.matchAll(pattern)].length;
async function main() {
const files = (await Promise.all(roots.map(filesUnder))).flat();
const rows = await Promise.all(files.map(async (file) => ({ file: file.replaceAll("\\", "/"), source: await readFile(file, "utf8") })));
const inventory = rows.map(({ file, source }) => ({
  file,
  clientFetches: count(source, /\bfetch\s*\(/g),
  sheetReads: count(source, /\breadSheetRows\s*\(/g),
  sheetBatchReads: count(source, /\breadSheetRowsBatch\s*\(/g),
  sheetWrites: count(source, /\b(?:writeSheetRowByHeaders|appendSheetRowsAtomically|upsertSheetRowsAtomically)\s*\(/g),
  directGoogleSdkCalls: count(source, /\b(?:spreadsheets\.values\.|drive\.(?:files|permissions)\.)/g),
})).filter((row) => row.clientFetches || row.sheetReads || row.sheetBatchReads || row.sheetWrites || row.directGoogleSdkCalls);

const allowedAdapters = new Set(["lib/google-sheets.ts", "lib/google-drive.ts"]);
const bypasses = inventory.filter((row) => row.directGoogleSdkCalls && !allowedAdapters.has(row.file));
const totals = inventory.reduce((sum, row) => ({
  clientFetches: sum.clientFetches + row.clientFetches,
  sheetReads: sum.sheetReads + row.sheetReads,
  sheetBatchReads: sum.sheetBatchReads + row.sheetBatchReads,
  sheetWrites: sum.sheetWrites + row.sheetWrites,
  directGoogleSdkCalls: sum.directGoogleSdkCalls + row.directGoogleSdkCalls,
}), { clientFetches: 0, sheetReads: 0, sheetBatchReads: 0, sheetWrites: 0, directGoogleSdkCalls: 0 });

console.log(JSON.stringify({ generatedAt: new Date().toISOString(), totals, bypasses, inventory }, null, 2));
if (bypasses.length) process.exitCode = 1;
}

void main();
