import test from "node:test"
import assert from "node:assert/strict"
import { affiliationModule } from "./helpers/affiliation-p1-fixture"
import { affiliationConfig, type AffiliationKind, type AffiliationFilters } from "../lib/affiliations"
import { buildScopeIndex } from "../lib/auth/territorial-scope"
import { withDataScope, scopeReadRows } from "../lib/auth/data-context"
import type { readSheetRows, SheetRow } from "../lib/google-sheets"

function dataFor(kind: AffiliationKind) {
  const config = affiliationConfig[kind]
  const data: Record<string, SheetRow[]> = {
    LIGUES: [{ id_ligue: "L1" }, { id_ligue: "L2" }],
    ENTENTES: [{ id_entente: "E1", id_ligue: "L1" }, { id_entente: "E2", id_ligue: "L1" }, { id_entente: "E3", id_ligue: "L2" }],
    CLUBS: [1, 2, 3].map(i => ({ id_club: `C${i}`, nom_club: `Club ${i}`, id_entente: `E${i}` })),
    EQUIPES: [1, 2, 3].map(i => ({ id_equipe: `T${i}`, nom_equipe: `Equipe ${i}`, id_club: `C${i}` })),
    STATUTS_AFFILIATION: [{ id_statut_affiliation: "SAF001", nom_statut_affiliation: "Active" }],
    CATEGORIES_AGE: [{ id_categorie_age: "CAT", nom_categorie_age: "Senior", age_min: "18", age_max: "" }],
    FONCTIONS: [{ id_fonction: "FON005", nom_fonction: "Entraineur" }], FEDERATION: [{ id_federation: "FED", nom_officiel: "Federation" }],
  }
  for (const [sheet, key] of [["ATHLETES", "id_athlete"], ["COACHS", "id_coach"], ["MEDECINS", "id_medecin"], ["OFFICIELS", "id_officiel"]]) {
    data[sheet] = ["A1", "A2"].map(id => ({ [key]: id, nom_complet: `Synthetique ${id}`, id_sexe: "SEX001", date_naissance: "1990-01-01" }))
  }
  const affiliations = [
    ["DUP", "A1", "T1", "2026-01-01", "first"], ["DUP", "A1", "T2", "2026-01-01", "second"],
    ["CROSS", "A1", "T3", "2026-02-01", "cross"], ["OTHER", "A2", "T1", "2025-01-01", "other"],
    ["ORPHAN", "UNKNOWN", "MISSING", "", "orphan"], ["TRIM", " A1 ", "MISSING", "2026-01-01", "trim"],
    ["EMPTY", "", "T1", "2026-01-01", "empty"], ["NO-TEAM", "A1", "", "2026-01-01", "missing-team"],
  ]
  for (const family of Object.values(affiliationConfig)) {
    data[family.sheet] = affiliations.map(([id, actorId, teamId, date, observation]) => ({ [family.id]: id, [family.actor]: actorId, id_equipe: teamId, date_debut: date, date_fin: "", observation, id_statut_affiliation: id === "TRIM" ? "UNKNOWN" : "SAF001", id_fonction: "FON005", id_type_entite: "STR003", id_entite: teamId.replace("T", "C") }))
  }
  assert.ok(data[config.sheet])
  return data
}

function fixture(kind: AffiliationKind, data = dataFor(kind), failSheet = "", hideConfirmation = false) {
  let writes = 0
  const reads: Array<{ sheet: string; fresh: boolean }> = []
  const readRows: typeof readSheetRows = async params => {
    const sheet = typeof params === "string" ? params : params.sheet
    reads.push({ sheet, fresh: typeof params !== "string" && !!params.fresh })
    if (sheet === failSheet) throw Error("synthetic failure")
    return scopeReadRows(sheet, data[sheet] || [])
  }
  const writeRow = async ({ sheet, idHeader, id, values, mode }: { sheet: string; idHeader: string; id: string; values: SheetRow; mode: "create" | "update" }) => {
    writes++
    const result = { ...values, [idHeader]: id }
    if (!hideConfirmation) data[sheet] = mode === "create" ? [...data[sheet], result] : data[sheet].map(row => row[idHeader] === id ? { ...row, ...result } : row)
    return result
  }
  return { deps: { readRows, writeRow }, reads, data, get writes() { return writes } }
}
async function outcome(work: () => Promise<unknown>) {
  try { return { response: JSON.stringify(await work()) } }
  catch (error) { const e = error as Error & { code?: string; status?: number; fields?: unknown }; return { error: { name: e.name, message: e.message, code: e.code, status: e.status, fields: e.fields } } }
}

test("P1: exact responses, raw/derived filters, stable duplicates and crossed federal/league/entente scopes", async () => {
  const before = await affiliationModule(true, true), after = await affiliationModule(false, true)
  const filters: Array<string | AffiliationFilters> = ["A1", {}, { actorId: "" }, { actorId: "missing" }, { actorId: " A1 " }, { actorId: "a1" }, { actorId: "A1" }, { actorId: "UNKNOWN" }, { actorId: "A1", equipeId: "T2", clubId: "C2", ligueId: "L1" }, { actorId: "A1", equipeId: "MISSING" }, { equipeId: "T1" }, { clubId: "C1", ligueId: "L1" }, { actorId: "A1", typeEntiteId: "STR003", entiteId: "C1" }]
  for (const kind of Object.keys(affiliationConfig) as AffiliationKind[]) {
    for (const territory of [null, { idLigue: "L1" }, { idLigue: "L2" }, { idEntente: "E1" }, { idEntente: "E2" }, { idEntente: "E3" }]) {
      for (const query of filters) {
        const old = fixture(kind), next = fixture(kind), scope = territory ? buildScopeIndex(territory, old.data) : null
        before.resetEnriched(); after.resetEnriched()
        const result = await withDataScope(scope, () => outcome(() => after.listAffiliations(kind, query, next.deps)))
        assert.deepEqual(result, await withDataScope(scope, () => outcome(() => before.listAffiliations(kind, query, old.deps))), JSON.stringify({ kind, territory, query }))
        assert.deepEqual(next.reads, old.reads, "reads/order/fresh flags unchanged")
        const actorId = typeof query === "string" ? query : query.actorId
        const scopedRows = withDataScope(scope, () => scopeReadRows(affiliationConfig[kind].sheet, next.data[affiliationConfig[kind].sheet]))
        assert.equal(before.enriched(), scopedRows.length)
        assert.equal(after.enriched(), actorId ? scopedRows.filter(row => String(row[affiliationConfig[kind].actor] ?? "").trim() === actorId).length : scopedRows.length)
      }
    }
  }
  for (const [territory, expected] of [[null, ["CROSS", "DUP", "DUP", "TRIM", "NO-TEAM"]], [{ idLigue: "L1" }, ["DUP", "DUP"]], [{ idEntente: "E1" }, ["DUP"]]] as const) {
    const f = fixture("athlete"), scope = territory ? buildScopeIndex(territory, f.data) : null
    const result = await withDataScope(scope, () => after.listAffiliations("athlete", "A1", f.deps))
    assert.deepEqual(result.map(item => item.id), expected)
    if (!territory) assert.deepEqual(result.filter(item => item.id === "DUP").map(item => item.observation), ["first", "second"])
  }
})

test("P1: empty result preserves source failures; no source or cache shortcut", async () => {
  const before = await affiliationModule(true, true), after = await affiliationModule(false, true)
  for (const kind of Object.keys(affiliationConfig) as AffiliationKind[]) {
    const data = dataFor(kind)
    data[affiliationConfig[kind].sheet] = []
    const old = fixture(kind, structuredClone(data)), next = fixture(kind, structuredClone(data))
    before.resetEnriched(); after.resetEnriched()
    assert.deepEqual(await after.listAffiliations(kind, "A1", next.deps), await before.listAffiliations(kind, "A1", old.deps))
    assert.equal(after.enriched(), 0); assert.equal(before.enriched(), 0)
    assert.deepEqual(next.reads, old.reads)
  }
  for (const sheet of ["ATHLETE_AFFILIATIONS", "STATUTS_AFFILIATION", "ATHLETES", "EQUIPES", "CLUBS", "ENTENTES", "CATEGORIES_AGE"]) {
    const old = fixture("athlete", undefined, sheet), next = fixture("athlete", undefined, sheet)
    assert.deepEqual(await outcome(() => after.listAffiliations("athlete", "missing", next.deps)), await outcome(() => before.listAffiliations("athlete", "missing", old.deps)))
    assert.deepEqual(next.reads, old.reads)
  }
})

test("P1: create/update/idempotence/error confirmations remain exact with only target rows enriched", async () => {
  const before = await affiliationModule(true, true), after = await affiliationModule(false, true)
  for (const kind of Object.keys(affiliationConfig) as AffiliationKind[]) {
    const old = fixture(kind), next = fixture(kind)
    const body = { id_equipe: "T2", id_type_entite: "STR003", id_entite: "C2", id_fonction: "FON005", date_debut: "2028-01-01", date_fin: "2028-12-31", id_statut_affiliation: "SAF001", observation: "Created" }
    const oldCreated = await before.mutateAffiliation(kind, "create", "A2", body, undefined, old.deps)
    after.resetEnriched()
    const created = await after.mutateAffiliation(kind, "create", "A2", body, undefined, next.deps)
    assert.equal(JSON.stringify(created), JSON.stringify(oldCreated)); assert.equal(after.enriched(), 2)
    for (const command of [
      { mode: "create" as const, actor: "A2", body, id: undefined },
      { mode: "update" as const, actor: "A2", body: { observation: "Changed" }, id: created.id },
      { mode: "update" as const, actor: "A1", body: {}, id: created.id },
      { mode: "create" as const, actor: "A2", body: { ...body, observation: "Overlap" }, id: undefined },
      { mode: "create" as const, actor: "A2", body: { ...body, date_debut: "invalid" }, id: undefined },
    ]) {
      before.resetEnriched(); after.resetEnriched()
      assert.deepEqual(await outcome(() => after.mutateAffiliation(kind, command.mode, command.actor, command.body, command.id, next.deps)), await outcome(() => before.mutateAffiliation(kind, command.mode, command.actor, command.body, command.id, old.deps)))
      assert.equal(after.enriched(), before.enriched() ? 2 : 0)
    }
    assert.deepEqual(next.data, old.data); assert.deepEqual(next.reads, old.reads); assert.equal(next.writes, old.writes); assert.equal(next.writes, 2)
    assert.ok(next.reads.some(read => read.fresh))
    const oldMissing = fixture(kind, undefined, "", true), nextMissing = fixture(kind, undefined, "", true)
    assert.deepEqual(await outcome(() => after.mutateAffiliation(kind, "create", "A2", body, undefined, nextMissing.deps)), await outcome(() => before.mutateAffiliation(kind, "create", "A2", body, undefined, oldMissing.deps)))
  }
})
