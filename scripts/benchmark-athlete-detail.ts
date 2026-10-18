import assert from "node:assert/strict"
import { performance } from "node:perf_hooks"
import { createAthleteDetailFixture, syntheticAthleteValues } from "../tests/helpers/athlete-detail-fixture"

async function main() {
  const values = syntheticAthleteValues(26198)
  const before = await createAthleteDetailFixture(true, values, false), after = await createAthleteDetailFixture(false, values, false)
  const samples: { method: string; round: number; cpuMs: number; elapsedMs: number }[] = []
  const query = "?id=ATH22143", iterations = 3
  async function run(fixture: typeof before) {
    const response = await fixture.request(query)
    assert.equal(response.status, 200)
    return response.text()
  }
  try {
    console.log(JSON.stringify({ rows: values.length - 1, columns: values[0].length, node: process.version, icu: process.versions.icu, v8: process.versions.v8, source: "synthetic-memory", transformationProbes: false, warmupPairs: 3, measuredPairs: 5, iterationsPerSample: iterations, includes: "real guard with synthetic session + full Sheets conversion + normalization + age enrichment + JSON; no network or Google latency; federal scope" }))
    for (let warmup = 0; warmup < 3; warmup++) assert.equal(await run(after), await run(before))
    for (let round = 1; round <= 5; round++) {
      const responses = new Map<string, string>()
      for (const method of round % 2 ? ["before", "after"] : ["after", "before"]) {
        const fixture = method === "before" ? before : after
        fixture.resetCounts()
        const cpuStart = process.cpuUsage(), elapsedStart = performance.now()
        let body = ""
        for (let iteration = 0; iteration < iterations; iteration++) body = await run(fixture)
        const elapsedMs = (performance.now() - elapsedStart) / iterations, cpu = process.cpuUsage(cpuStart)
        const sample = { method, round, cpuMs: (cpu.user + cpu.system) / 1000 / iterations, elapsedMs }
        samples.push(sample); responses.set(method, body)
        console.log(JSON.stringify({ ...sample, convertedPerRequest: fixture.state.convertedRows / iterations }))
      }
      assert.equal(responses.get("after"), responses.get("before"))
    }
    for (const method of ["before", "after"]) {
      const selected = samples.filter(sample => sample.method === method)
      const summary = (key: "cpuMs" | "elapsedMs") => { const ordered = selected.map(sample => sample[key]).sort((a, b) => a - b); return { min: ordered[0], median: ordered[2], max: ordered[4] } }
      console.log(JSON.stringify({ summary: method, cpuMs: summary("cpuMs"), elapsedMs: summary("elapsedMs"), identicalResponse: true }))
    }
  } finally { before.close(); after.close() }
}
main().catch(() => { console.error("Benchmark non terminé : configuration de test ou équivalence invalide. Données synthétiques uniquement."); process.exitCode = 1 })
