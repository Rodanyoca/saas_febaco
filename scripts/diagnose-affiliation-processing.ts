// Diagnostic local uniquement : données synthétiques, aucune lecture/écriture Google.
import assert from "node:assert/strict"
import { performance } from "node:perf_hooks"
import { execFileSync } from "node:child_process"
import { listAffiliations } from "../lib/affiliations"
import { listAthleteLicences } from "../lib/licences"
import type { SheetRow, readSheetRows } from "../lib/google-sheets"

async function main() {
  const runs = 9, warmups = 3, results = []
  for (const size of [6000, 14000, 28000]) {
    const rows: Record<string, SheetRow[]> = {
      ATHLETES: Array.from({ length: 26199 }, (_, i) => ({ id_athlete: `SYN-${i}`, nom_complet: `Synthetique ${i}`, id_sexe: "SEX001", date_naissance: "2000-01-01" })),
      ATHLETE_AFFILIATIONS: Array.from({ length: size }, (_, i) => ({ id_affiliation_athlete: `AFF-${i}`, id_athlete: `SYN-${i % 26199}`, id_equipe: `TEAM-${i % 100}`, date_debut: "2026-01-01", date_fin: "", id_statut_affiliation: "SAF001", observation: "" })),
      EQUIPES: Array.from({ length: 100 }, (_, i) => ({ id_equipe: `TEAM-${i}`, nom_equipe: `Equipe ${i}`, id_club: "CLUB" })),
      CLUBS: [{ id_club: "CLUB", nom_club: "Club synthetique", id_entente: "ENT" }],
      ENTENTES: [{ id_entente: "ENT", id_ligue: "LIG" }], LIGUES: [{ id_ligue: "LIG" }],
      CATEGORIES_AGE: [{ id_categorie_age: "CAT", nom_categorie_age: "Seniors", age_min: "18", age_max: "" }],
      STATUTS_AFFILIATION: [{ id_statut_affiliation: "SAF001", nom_statut_affiliation: "Active" }],
      SAISON: [{ id_saison: "SEA", nom_saison: "2026" }], STATUT_LICENCE: [{ id_statut_licence: "STL001", nom_statut_licence: "Active" }], SEXES: [{ id_sexe: "SEX001", nom_sexe: "M" }],
      ATHLETE_LICENCES: Array.from({ length: size }, (_, i) => ({ id_licence: `LIC-${i}`, id_athlete: `SYN-${i % 26199}`, id_affiliation_athlete: `AFF-${i}`, id_saison: "SEA", numero_licence: `${i}`, date_delivrance: "2026-01-01", id_statut_licence: "STL001", observations: "" })),
    }
    let reads = 0
    const readRows: typeof readSheetRows = async (params) => { reads++; return rows[typeof params === "string" ? params : params.sheet] || [] }
    const noWrite = async (): Promise<never> => { throw Error("Diagnostic interdit en ecriture") }
    const deps = { readRows, writeRow: noWrite, appendRows: noWrite, upsertRows: noWrite }
    const scenarios = [
      { name: "affiliations-one-athlete", readCount: 7, run: () => listAffiliations("athlete", { actorId: "SYN-0" }, deps) },
      { name: "licences-one-athlete", readCount: 10, run: async () => (await listAthleteLicences({ athleteId: "SYN-0" }, { role: "federal" }, deps)).licences },
    ]
    for (const scenario of scenarios) {
      const expected = await scenario.run(), expectedJson = JSON.stringify(expected)
      assert.equal(expected.length, Math.ceil(size / 26199))
      for (let i = 0; i < warmups; i++) await scenario.run()
      const elapsed = [], cpu = []
      for (let i = 0; i < runs; i++) {
        reads = 0
        const startCpu = process.cpuUsage(), start = performance.now()
        const result = await scenario.run()
        elapsed.push(performance.now() - start)
        const consumed = process.cpuUsage(startCpu)
        cpu.push((consumed.user + consumed.system) / 1000)
        assert.equal(reads, scenario.readCount)
        assert.equal(JSON.stringify(result), expectedJson)
      }
      const percentile = (values: number[], fraction: number) => [...values].sort((a, b) => a - b)[Math.ceil(values.length * fraction) - 1]
      results.push({ scenario: scenario.name, population: size, returnedRows: expected.length, logicalReads: scenario.readCount, jsonBytes: Buffer.byteLength(JSON.stringify({ [scenario.name.startsWith("affiliations") ? "affiliations" : "licences"]: expected })), elapsedMedianMs: percentile(elapsed, .5), elapsedP95Ms: percentile(elapsed, .95), processCpuMedianMs: percentile(cpu, .5), processCpuP95Ms: percentile(cpu, .95), elapsedSamplesMs: elapsed, processCpuSamplesMs: cpu })
    }
  }
  console.log(JSON.stringify({ measuredUtc: new Date().toISOString(), commit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), node: process.version, icu: process.versions.icu, platform: process.platform, warmups, runs, input: "synthetic-only", includes: "Published services, indexes, enrichment, filtering, sorting. CPU samples are process-wide in a serial diagnostic without other requests.", excludes: "Google/network, raw sheet conversion, authentication/scope construction, HTTP serialization timing, browser, Vercel CPU. GC/background runtime work can affect CPU samples; RSS is not a request allocation measure.", results }, null, 2))
}
main().catch(() => { console.error("Diagnostic échoué ; aucune donnée métier affichée."); process.exitCode = 1 })
