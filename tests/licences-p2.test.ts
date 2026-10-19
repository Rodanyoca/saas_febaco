import test from "node:test"
import assert from "node:assert/strict"
import { licenceModule } from "./helpers/licence-p2-fixture"
import { buildScopeIndex } from "../lib/auth/territorial-scope"
import { scopeReadRows, withDataScope } from "../lib/auth/data-context"
import type { AccessScope } from "../lib/auth-scope"
import type { readSheetRows, SheetRow } from "../lib/google-sheets"
import { createAthleteDetailFixture } from "./helpers/athlete-detail-fixture"

export function licenceRows(): Record<string, SheetRow[]> {
  const row = { id_licence: "DUP", id_athlete: "A1", id_affiliation_athlete: "F1", id_saison: "S1", numero_licence: "001", date_delivrance: "2026-01-01", id_statut_licence: "STL001" }
  return {
    ATHLETE_LICENCES: [row, { ...row, observations: "second" }, { ...row, id_licence: "CROSS", id_affiliation_athlete: "F2" }, { ...row, id_licence: "TRIM", id_athlete: " A1 ", id_saison: "S2" }, { ...row, id_licence: "OTHER", id_athlete: "A2", id_affiliation_athlete: "F3" }, { ...row, id_licence: "ORPHAN", id_affiliation_athlete: "missing", id_statut_licence: "UNKNOWN" }, { ...row, id_licence: "NO-ACTOR", id_athlete: "NO-ACTOR" }],
    ATHLETE_AFFILIATIONS: [{ id_affiliation_athlete: "F1", id_athlete: "A1", id_equipe: "T1" }, { id_affiliation_athlete: "F2", id_athlete: "A1", id_equipe: "T2" }, { id_affiliation_athlete: "F3", id_athlete: "A2", id_equipe: "T3" }],
    ATHLETES: [{ id_athlete: "A1", nom_complet: "Synthetic first", id_sexe: "SEX002" }, { id_athlete: "A1", nom_complet: "Synthetic last", id_sexe: "SEX001" }, { id_athlete: "A2" }],
    EQUIPES: [{ id_equipe: "T1", id_club: "C1" }, { id_equipe: "T2", id_club: "C2" }, { id_equipe: "T3", id_club: "C3" }],
    CLUBS: [{ id_club: "C1", id_entente: "E1" }, { id_club: "C2", id_entente: "E2" }, { id_club: "C3", id_entente: "E3" }],
    ENTENTES: [{ id_entente: "E1", id_ligue: "L1" }, { id_entente: "E2", id_ligue: "L1" }, { id_entente: "E3", id_ligue: "L2" }],
    LIGUES: [{ id_ligue: "L1" }, { id_ligue: "L2" }],
    SAISON: [{ id_saison: "S1", nom_saison: "2025" }, { id_saison: "S2", nom_saison: "2026" }],
    STATUT_LICENCE: [{ id_statut_licence: "STL001", nom_statut_licence: "ACTIVE" }], SEXES: [{ id_sexe: "SEX001", nom_sexe: "M" }],
  }
}
function fixture(data = licenceRows(), fail = "") {
  const reads: unknown[] = []
  const readRows: typeof readSheetRows = async params => { const sheet = typeof params === "string" ? params : params.sheet; reads.push(params); if (sheet === fail) throw Error("synthetic offline"); return scopeReadRows(sheet, data[sheet] || []) }
  const noWrite = async (): Promise<never> => { throw Error("No writes in GET test") }
  return { data, reads, deps: { readRows, appendRows: noWrite, upsertRows: noWrite } }
}

test("P2 history: exact JSON, stable duplicates/order, missing data and crossed territories; global list unchanged", async () => {
  const old = await licenceModule(true, true), next = await licenceModule(false, true)
  const scopes: AccessScope[] = [{ role: "federal" }, { role: "ligue", ligueId: "L1" }, { role: "ligue", ligueId: "L2" }, { role: "entente", ententeId: "E1" }, { role: "entente", ententeId: "E2" }, { role: "entente", ententeId: "E3" }]
  for (const scope of scopes) {
    const a = fixture(), b = fixture(), territory = scope.role === "federal" ? null : buildScopeIndex(scope.role === "ligue" ? { idLigue: scope.ligueId } : { idEntente: scope.ententeId }, a.data)
    await withDataScope(territory, async () => {
      for (const athleteId of ["A1", "A2", "NO-ACTOR", "UNKNOWN", "a1", " A1 ", ""]) {
        a.reads.length = b.reads.length = 0; old.reset(); next.reset()
        const before = await old.listAthleteLicences({ athleteId }, scope, a.deps)
        const after = await next.listAthleteLicenceHistory(athleteId, scope, b.deps)
        assert.equal(JSON.stringify(after), JSON.stringify(before.licences), JSON.stringify({ scope, athleteId }))
        assert.deepEqual(b.reads, a.reads)
        const authorized = scopeReadRows("ATHLETE_LICENCES", a.data.ATHLETE_LICENCES)
        assert.deepEqual(next.counts(), { views: athleteId ? authorized.filter(row => row.id_athlete.trim() === athleteId).length : authorized.length, summaries: 0 })
        assert.equal(old.counts().views, authorized.length); assert.equal(old.counts().summaries, 1)
      }
      for (const filter of [{}, { seasonId: "S1" }, { teamId: "T1", statusId: "STL001", search: "001", athleteId: "A1" }]) {
        assert.equal(JSON.stringify(await next.listAthleteLicences(filter, scope, b.deps)), JSON.stringify(await old.listAthleteLicences(filter, scope, a.deps)))
      }
    })
  }
  const f = fixture()
  const history = await next.listAthleteLicenceHistory("A1", { role: "federal" }, f.deps)
  assert.deepEqual(history.filter(row => row.id === "DUP").map(row => row.observations), ["", "second"])
});

test("P2 preserves source failures even for unknown IDs, and handles an empty licence sheet", async () => {
  const old = await licenceModule(true), next = await licenceModule(false)
  for (const sheet of Object.keys(licenceRows())) {
    const a = fixture(undefined, sheet), b = fixture(undefined, sheet)
    await assert.rejects(old.listAthleteLicences({ athleteId: "UNKNOWN" }, { role: "federal" }, a.deps), /synthetic offline/)
    await assert.rejects(next.listAthleteLicenceHistory("UNKNOWN", { role: "federal" }, b.deps), /synthetic offline/)
    assert.deepEqual(a.reads, b.reads)
  }
  const data = licenceRows(); data.ATHLETE_LICENCES = []
  assert.deepEqual(await next.listAthleteLicenceHistory("A1", { role: "federal" }, fixture(data).deps), [])
});

test("P2 real route/guard: identical envelope, trim, scopes, 400/401/403 and source/auth failures", async () => {
  const before = await createAthleteDetailFixture(false, undefined, false, "tests/fixtures/athlete-licence-route-before-p2.ts", "/api/athlete-licences")
  const after = await createAthleteDetailFixture(false, undefined, false, "app/api/athlete-licences/route.ts", "/api/athlete-licences")
  const data = licenceRows()
  const values = (rows: SheetRow[]) => { const keys = [...new Set(rows.flatMap(row => Object.keys(row)))]; return [keys, ...rows.map(row => keys.map(key => row[key] || ""))] }
  try {
    for (const f of [before, after]) for (const [sheet, rows] of Object.entries(data)) f.state.extraValues[sheet] = values(rows)
    const compare = async (query: string, expectedStatus: number) => {
      before.resetCounts(); after.resetCounts()
      const a = await before.request(query), b = await after.request(query)
      assert.equal(a.status, expectedStatus); assert.equal(b.status, a.status); assert.equal(await b.text(), await a.text())
      assert.equal(b.headers.get("cache-control"), a.headers.get("cache-control")); assert.deepEqual(after.state.sheetReads, before.state.sheetReads)
    }
    for (const scope of [null, { idLigue: "L1" }, { idEntente: "E1" }, { idEntente: "E3" }]) {
      for (const f of [before, after]) { f.state.user = { ...f.user, ...scope }; f.state.scope = scope ? buildScopeIndex(scope, data) : null }
      for (const query of ["", "?athleteId=", "?athleteId=%20", "?athleteId=A1", "?athleteId=%20A1%20", "?athleteId=UNKNOWN", "?athleteId=A2", "?athleteId=A1&search=ignored&saison=ignored"]) await compare(query, !new URL("https://fixture.invalid/" + query).searchParams.get("athleteId")?.trim() ? 400 : 200)
    }
    for (const f of [before, after]) { f.state.user = null; f.state.scope = null }
    await compare("?athleteId=A1", 401); assert.equal(after.state.sheetReads.length, 0)
    for (const f of [before, after]) { f.state.user = { ...f.user }; f.state.grants = [] }
    await compare("?athleteId=A1", 403); assert.equal(after.state.sheetReads.length, 0)
    for (const f of [before, after]) { f.state.grants = [f.grant]; f.state.authUnavailable = true }
    await compare("?athleteId=A1", 503)
    for (const f of [before, after]) { f.state.authUnavailable = false; f.state.failSheet = "SAISON" }
    await compare("?athleteId=UNKNOWN", 500)
  } finally { before.close(); after.close() }
});
