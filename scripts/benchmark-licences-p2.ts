import assert from "node:assert/strict"
import { performance } from "node:perf_hooks"
import { readFile, writeFile } from "node:fs/promises"
import { createHash } from "node:crypto"
import { execFileSync } from "node:child_process"
import { licenceModule } from "../tests/helpers/licence-p2-fixture"
import type { readSheetRows, SheetRow } from "../lib/google-sheets"

async function main() {
  const before = await licenceModule(true), after = await licenceModule(false), results = []
  const warmups = 3, rounds = 9
  for (const size of [6000, 14000, 28000]) {
    const data: Record<string, SheetRow[]> = {
      ATHLETE_LICENCES: Array.from({ length: size }, (_, i) => ({ id_licence: `LIC-${i}`, id_athlete: `SYN-${i % 26199}`, id_affiliation_athlete: `AFF-${i}`, id_saison: `S${i % 3}`, numero_licence: String(i).padStart(7, "0"), date_delivrance: "2026-01-01", id_statut_licence: "STL001" })),
      ATHLETE_AFFILIATIONS: Array.from({ length: size }, (_, i) => ({ id_affiliation_athlete: `AFF-${i}`, id_athlete: `SYN-${i % 26199}`, id_equipe: `T-${i % 100}` })),
      ATHLETES: Array.from({ length: 26199 }, (_, i) => ({ id_athlete: `SYN-${i}`, nom_complet: `Synthetic ${i}`, id_sexe: "SEX001" })),
      EQUIPES: Array.from({ length: 100 }, (_, i) => ({ id_equipe: `T-${i}`, id_club: "C" })),
      CLUBS: [{ id_club: "C", id_entente: "E" }], ENTENTES: [{ id_entente: "E", id_ligue: "L" }], LIGUES: [{ id_ligue: "L" }],
      SAISON: [0, 1, 2].map(i => ({ id_saison: `S${i}`, nom_saison: String(2024 + i) })),
      STATUT_LICENCE: [{ id_statut_licence: "STL001", nom_statut_licence: "ACTIVE" }], SEXES: [{ id_sexe: "SEX001", nom_sexe: "M" }],
    }
    let reads = 0
    const readRows: typeof readSheetRows = async params => { reads++; return data[typeof params === "string" ? params : params.sheet] || [] }
    const noWrite = async (): Promise<never> => { throw Error("No writes in benchmark") }
    const deps = { readRows, appendRows: noWrite, upsertRows: noWrite }
    for (const scenario of [
      { name: "one-athlete", id: "SYN-0", iterations: 10 },
      { name: "unknown-athlete", id: "UNKNOWN", iterations: 10 },
      { name: "global-control", id: null, iterations: 1 },
    ]) {
      const run = async (method: "before" | "after") => {
        const service = method === "before" ? before : after
        return JSON.stringify(scenario.id === null ? await service.listAthleteLicences({}, { role: "federal" }, deps) : { licences: method === "before" ? (await before.listAthleteLicences({ athleteId: scenario.id }, { role: "federal" }, deps)).licences : await after.listAthleteLicenceHistory(scenario.id, { role: "federal" }, deps) })
      }
      const expected = await run("before"); assert.equal(await run("after"), expected)
      for (let pair = 0; pair < warmups; pair++) for (const method of pair % 2 ? ["after", "before"] as const : ["before", "after"] as const) await run(method)
      const samples: Array<{ pair: number; method: "before" | "after"; elapsedMs: number; processCpuMs: number }> = []
      for (let pair = 0; pair < rounds; pair++) for (const method of pair % 2 ? ["after", "before"] as const : ["before", "after"] as const) {
        reads = 0
        const elapsedStart = performance.now(), cpuStart = process.cpuUsage()
        let body = ""
        for (let i = 0; i < scenario.iterations; i++) body = await run(method)
        const cpu = process.cpuUsage(cpuStart)
        samples.push({ pair, method, elapsedMs: (performance.now() - elapsedStart) / scenario.iterations, processCpuMs: (cpu.user + cpu.system) / 1000 / scenario.iterations })
        assert.equal(body, expected); assert.equal(reads, 10 * scenario.iterations)
      }
      const summarize = (method: string) => {
        const values = samples.filter(row => row.method === method)
        const median = (key: "elapsedMs" | "processCpuMs") => values.map(row => row[key]).sort((a, b) => a - b)[Math.floor(rounds / 2)]
        return { elapsedMedianMs: median("elapsedMs"), processCpuMedianMs: median("processCpuMs") }
      }
      results.push({ population: size, scenario: scenario.name, returnedRows: JSON.parse(expected).licences.length, jsonBytes: Buffer.byteLength(expected), iterations: scenario.iterations, logicalReads: 10, exactResponse: true, before: summarize("before"), after: summarize("after"), samples })
    }
  }
  const hash = async (path: string) => createHash("sha256").update(await readFile(path)).digest("hex")
  const report = { measuredUtc: new Date().toISOString(), baseCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), node: process.version, icu: process.versions.icu, platform: process.platform, beforeSha256: await hash("tests/fixtures/licences-before-p2.ts"), afterSha256: await hash("lib/licences.ts"), warmupPairs: warmups, measuredAlternatedPairs: rounds, syntheticOnly: true, transformationProbes: false, includes: "Same preconverted row objects, indexes, enrichment, permissions in service, list summaries before only, and exact response JSON serialization. Serial batches in one process.", excludes: "Google I/O, cell conversion, HTTP/guard/scope construction, client navigation and mutations. CPU counters cover this entire process with limited Windows resolution; GC/runtime background work included. No Vercel CPU measurement.", results }
  await writeFile(process.argv[2] || "docs/performance/mesures-p2-2026-10-19.json", JSON.stringify(report, null, 2) + "\n", "utf8")
}
main().catch(() => { console.error("P2 synthetic benchmark failed"); process.exitCode = 1 })
