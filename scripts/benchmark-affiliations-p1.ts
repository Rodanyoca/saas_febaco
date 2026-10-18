import assert from "node:assert/strict"
import { performance } from "node:perf_hooks"
import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { readFile, writeFile } from "node:fs/promises"
import { affiliationModule } from "../tests/helpers/affiliation-p1-fixture"
import type { readSheetRows, SheetRow } from "../lib/google-sheets"

async function main() {
  const before = await affiliationModule(true), after = await affiliationModule(false)
  const runs = 9, warmups = 3, results = []
  for (const size of [6000, 14000, 28000]) {
    const rows: Record<string, SheetRow[]> = {
      ATHLETES: Array.from({ length: 26199 }, (_, i) => ({ id_athlete: `SYN-${i}`, nom_complet: `Synthetique ${i}`, id_sexe: "SEX001", date_naissance: "2000-01-01" })),
      ATHLETE_AFFILIATIONS: Array.from({ length: size }, (_, i) => ({ id_affiliation_athlete: `AFF-${i}`, id_athlete: `SYN-${i % 26199}`, id_equipe: `TEAM-${i % 100}`, date_debut: "2026-01-01", date_fin: "", id_statut_affiliation: "SAF001", observation: "" })),
      EQUIPES: Array.from({ length: 100 }, (_, i) => ({ id_equipe: `TEAM-${i}`, nom_equipe: `Equipe ${i}`, id_club: "CLUB" })),
      CLUBS: [{ id_club: "CLUB", nom_club: "Club synthetique", id_entente: "ENT" }],
      ENTENTES: [{ id_entente: "ENT", id_ligue: "LIG" }],
      CATEGORIES_AGE: [{ id_categorie_age: "CAT", nom_categorie_age: "Seniors", age_min: "18", age_max: "" }],
      STATUTS_AFFILIATION: [{ id_statut_affiliation: "SAF001", nom_statut_affiliation: "Active" }],
    }
    let reads = 0
    const readRows: typeof readSheetRows = async params => { reads++; return rows[typeof params === "string" ? params : params.sheet] || [] }
    const deps = { readRows, writeRow: async (): Promise<never> => { throw Error("No writes in benchmark") } }
    for (const scenario of [
      { name: "one-athlete", query: { actorId: "SYN-0" }, expected: Math.ceil(size / 26199), iterations: 20 },
      { name: "unknown-athlete", query: { actorId: "SYN-UNKNOWN" }, expected: 0, iterations: 20 },
      { name: "unfiltered-control", query: {}, expected: size, iterations: 3 },
    ]) {
      const run = async (service: typeof before) => JSON.stringify({ affiliations: await service.listAffiliations("athlete", scenario.query, deps) })
      const expected = await run(before)
      assert.equal(JSON.parse(expected).affiliations.length, scenario.expected)
      assert.equal(await run(after), expected)
      for (let pair = 0; pair < warmups; pair++) for (const service of pair % 2 ? [after, before] : [before, after]) await run(service)
      const samples: Array<{ round: number; method: "before" | "after"; elapsedMs: number; processCpuMs: number }> = []
      for (let round = 0; round < runs; round++) {
        for (const method of round % 2 ? ["after", "before"] as const : ["before", "after"] as const) {
          reads = 0
          const cpuStart = process.cpuUsage(), elapsedStart = performance.now()
          let body = ""
          for (let iteration = 0; iteration < scenario.iterations; iteration++) body = await run(method === "before" ? before : after)
          const elapsedMs = (performance.now() - elapsedStart) / scenario.iterations, cpu = process.cpuUsage(cpuStart)
          samples.push({ round, method, elapsedMs, processCpuMs: (cpu.user + cpu.system) / 1000 / scenario.iterations })
          assert.equal(body, expected)
          assert.equal(reads, 7 * scenario.iterations)
        }
      }
      const summary = (method: string) => {
        const selected = samples.filter(sample => sample.method === method)
        const median = (key: "elapsedMs" | "processCpuMs") => selected.map(sample => sample[key]).sort((a, b) => a - b)[Math.floor(runs / 2)]
        return { elapsedMedianMs: median("elapsedMs"), processCpuMedianMs: median("processCpuMs") }
      }
      results.push({ population: size, scenario: scenario.name, iterationsPerSample: scenario.iterations, returnedRows: scenario.expected, logicalReadsPerCall: 7, jsonBytes: Buffer.byteLength(expected), before: summary("before"), after: summary("after"), exactResponses: true, samples })
    }
  }
  const sourceHash = async (path: string) => createHash("sha256").update(await readFile(path)).digest("hex")
  const report = { measuredUtc: new Date().toISOString(), baseCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), beforeSha256: await sourceHash("tests/fixtures/affiliations-before-p1.ts"), afterSha256: await sourceHash("lib/affiliations.ts"), node: process.version, icu: process.versions.icu, platform: process.platform, warmupPairs: warmups, measuredAlternatedPairs: runs, syntheticOnly: true, transformationProbes: false, includes: "Published service with injected pre-converted scoped rows, indexes, enrichment, filters, stable sort and JSON serialization. Serial batches; no other requests in this process.", excludes: "Google I/O, raw cell conversion, guard/scope construction, HTTP transport, browser, mutations, Vercel CPU. Windows process CPU counters have limited resolution and include GC/background runtime work.", results }
  const json = JSON.stringify(report, null, 2)
  const output = process.argv[2]
  if (output) await writeFile(output, json + "\n", "utf8")
  else console.log(json)
}
main().catch(() => { console.error("Benchmark P1 échoué ; données synthétiques uniquement."); process.exitCode = 1 })
