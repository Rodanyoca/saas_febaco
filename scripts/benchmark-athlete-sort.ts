import assert from "node:assert/strict"
import { performance } from "node:perf_hooks"
import { createRequire } from "node:module"
import { getSheetsReadClient } from "../lib/google-clients"
import { sortActorsAlphabetically } from "../lib/actors"
import { sortAthletesAlphabetically } from "../lib/athlete-sort"

type Row = { id: string; nom_complet: string }
type Sample = { method: "before" | "after"; round: number; cpuMs: number; elapsedMs: number }
const collator = new Intl.Collator("fr", { sensitivity: "base", ignorePunctuation: true })
const source = process.argv.includes("--sheets") ? "sheets-memory" : "synthetic"

function syntheticRows(): Row[] {
  const names = ["Élodie", "elodie", "Anne-Marie", "Anne Marie", "O’Neil", "O'Neil", "Béatrice", "Zola", "", "Jean 10", "Jean 2", "œuvre"]
  let seed = 271828
  return Array.from({ length: 26198 }, (_, index) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return { id: `SYNTHETIC-${index}`, nom_complet: index % 97 === 0 ? "" : `${names[seed % names.length]} ${seed % 521}` }
  })
}

async function readRows(): Promise<Row[]> {
  if (source === "synthetic") return syntheticRows()
  const requireFromNext = createRequire(require.resolve("next/package.json"))
  requireFromNext("@next/env").loadEnvConfig(process.cwd())
  const spreadsheetId = process.env.GOOGLE_SHEETS_ACTEURS_ID
  if (!spreadsheetId) throw new Error("Classeur acteurs non configuré.")
  // Lecture unique ; noms et identifiants restent exclusivement en mémoire.
  const response = await getSheetsReadClient().spreadsheets.values.get({ spreadsheetId, range: "'ATHLETES'!A:ZZ" }, { timeout: 20000, retry: false })
  const [headers = [], ...values] = response.data.values ?? []
  const keys = headers.map(header => String(header ?? "").trim().toLowerCase())
  const idColumn = keys.indexOf("id_athlete"), nameColumn = keys.indexOf("nom_complet")
  if (idColumn < 0 || nameColumn < 0) throw new Error("En-têtes ATHLETES incompatibles.")
  return values.map(row => ({ id: String(row[idColumn] ?? "").trim(), nom_complet: String(row[nameColumn] ?? "").trim() })).filter(row => row.id)
}

function sameOrder(before: Row[], after: Row[], input: Row[]) {
  assert.equal(before.length, input.length)
  assert.equal(after.length, input.length)
  assert.ok(after.every((row, index) => row.id === before[index].id && row === before[index]))
  assert.equal(new Set(after).size, input.length)
}

function measure(method: Sample["method"], round: number, rows: Row[]) {
  const started = performance.now(), cpu = process.cpuUsage()
  const result = method === "before" ? sortActorsAlphabetically(rows) : sortAthletesAlphabetically(rows)
  const delta = process.cpuUsage(cpu), elapsedMs = performance.now() - started
  const sample = { method, round, cpuMs: (delta.user + delta.system) / 1000, elapsedMs }
  console.log(JSON.stringify(sample))
  return { result, sample }
}
function summarize(samples: Sample[], field: "cpuMs" | "elapsedMs") {
  const numbers = samples.map(sample => sample[field]).sort((a, b) => a - b)
  return { min: numbers[0], median: numbers[Math.floor(numbers.length / 2)], max: numbers.at(-1) }
}

async function main() {
  const deadline = setTimeout(() => { console.error("Benchmark interrompu : délai maximal atteint."); process.exit(1) }, 180000)
  deadline.unref()
  const rows = await readRows()
  console.log(JSON.stringify({ source, rows: rows.length, node: process.version, icu: process.versions.icu, v8: process.versions.v8, locale: collator.resolvedOptions(), warmupPairs: 2, measuredPairs: 5 }))
  // Sans serveur HTTP dans ce processus ; aucun appel réseau dans les sections mesurées.
  for (let warmup = 0; warmup < 2; warmup++) {
    sameOrder(sortActorsAlphabetically(rows), sortAthletesAlphabetically(rows), rows)
    console.log(JSON.stringify({ warmup: warmup + 1, sameOrder: true }))
  }
  const samples: Sample[] = []
  for (let round = 1; round <= 5; round++) {
    const order: Sample["method"][] = round % 2 ? ["before", "after"] : ["after", "before"]
    const results = new Map<Sample["method"], Row[]>()
    for (const method of order) { const measured = measure(method, round, rows); samples.push(measured.sample); results.set(method, measured.result) }
    sameOrder(results.get("before")!, results.get("after")!, rows)
  }
  for (const method of ["before", "after"] as const) {
    const selected = samples.filter(sample => sample.method === method)
    console.log(JSON.stringify({ summary: method, cpuMs: summarize(selected, "cpuMs"), elapsedMs: summarize(selected, "elapsedMs"), sameOrder: true, sameCount: true }))
  }
  clearTimeout(deadline)
}
main().catch(() => { console.error("Benchmark non terminé : source indisponible ou vérification d’équivalence échouée. Aucune donnée source affichée."); process.exitCode = 1 })
