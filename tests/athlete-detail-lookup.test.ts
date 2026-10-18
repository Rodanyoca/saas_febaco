import test from "node:test"
import assert from "node:assert/strict"
import { buildScopeIndex } from "../lib/auth/territorial-scope"
import { createAthleteDetailFixture, syntheticAthleteValues } from "./helpers/athlete-detail-fixture"

async function response(fixture: Awaited<ReturnType<typeof createAthleteDetailFixture>>, query: string) {
  const result = await fixture.request(query)
  return { status: result.status, cacheControl: result.headers.get("cache-control"), type: result.headers.get("content-type"), body: await result.text() }
}

test("GET athlète individuel : réponses identiques, paramètres id/search et doublons stables dans les périmètres réels", async () => {
  const values = syntheticAthleteValues(8)
  for (const [id, name] of [[" DUP ", "Zulu"], ["DUP", "Anne-Marie"], ["DUP", "Anne Marie"], ["dup", "Élodie"], ["", "Blank identifier"]]) {
    const row = [...values[1]]; row[0] = id; row[1] = name; values.push(row)
  }
  const before = await createAthleteDetailFixture(true, values), after = await createAthleteDetailFixture(false, values)
  const territory = {
    LIGUES: [{ id_ligue: "L1" }], ENTENTES: [{ id_entente: "E1", id_ligue: "L1" }, { id_entente: "E2", id_ligue: "L1" }],
    CLUBS: [{ id_club: "C1", id_entente: "E1" }, { id_club: "C2", id_entente: "E2" }], EQUIPES: [{ id_equipe: "T1", id_club: "C1" }, { id_equipe: "T2", id_club: "C2" }],
    ATHLETE_AFFILIATIONS: [{ id_athlete: "ATH00003", id_equipe: "T1" }, { id_athlete: "DUP", id_equipe: "T1" }, { id_athlete: "ATH00004", id_equipe: "T2" }, { id_athlete: "dup", id_equipe: "T2" }],
  }
  const queries = ["?id=ATH00003", "?id=%20ath00003%20", "?id=UNKNOWN", "?id=ATH00004", "?id=ATH00003&search=O%E2%80%99Neil", "?id=ATH00003&search=absent", "?id=ATH00003&search=ATH00003", "?id=DUP", "?id=dup&search=anne", "?id=dup&sort=licence&direction=desc", "?id=ATH00003&id=ATH00004", "?id=", "?id=%20%20", "?search=Zulu", "?id=&sort=licence"]
  try {
    for (const attachment of [{}, { idLigue: "L1" }, { idLigue: "L1", idEntente: "E1" }, { idLigue: "L1", idEntente: "E2" }]) {
      for (const fixture of [before, after]) {
        fixture.state.user = { ...fixture.user, ...attachment }
        fixture.state.scope = "idLigue" in attachment ? buildScopeIndex(fixture.state.user, territory) : null
      }
      for (const query of queries) assert.deepEqual(await response(after, query), await response(before, query), query)
    }
    for (const fixture of [before, after]) { fixture.state.user = { ...fixture.user, idLigue: "L1", idEntente: "E1" }; fixture.state.scope = buildScopeIndex(fixture.state.user, territory) }
    const foreign = await response(after, "?id=ATH00004")
    assert.equal(foreign.status, 200)
    assert.deepEqual(JSON.parse(foreign.body), { athletes: [] }, "identifiant hors périmètre masqué exactement comme un identifiant inconnu")
    const duplicates = JSON.parse((await response(after, "?id=DUP")).body).athletes
    assert.deepEqual(duplicates.map((row: Record<string, string>) => row.nom_complet), ["Anne-Marie", "Anne Marie", "Zulu"])
    assert.equal(after.state.configurationReads > 0, true, "les appels avec id vide continuent d'utiliser les saisons")
  } finally { before.close(); after.close() }
})

test("GET individuel : une normalisation et un enrichissement, aucun tri ; conversion Sheets complète conservée", async () => {
  const before = await createAthleteDetailFixture(true, syntheticAthleteValues(100)), after = await createAthleteDetailFixture(false, syntheticAthleteValues(100))
  try {
    assert.deepEqual(await response(after, "?id=ATH00003"), await response(before, "?id=ATH00003"))
    assert.equal(before.state.normalizations, 100); assert.equal(before.state.categoryCalls, 100)
    assert.equal(before.state.sortCalls, 1); assert.ok(before.state.comparisons > 0)
    assert.equal(after.state.normalizations, 1); assert.equal(after.state.categoryCalls, 1)
    assert.equal(after.state.sortCalls, 0); assert.equal(after.state.comparisons, 0)
    assert.equal(after.state.convertedRows, 100); assert.equal(before.state.convertedRows, 100)
    assert.deepEqual(after.state.sheetReads, before.state.sheetReads)
    assert.equal(after.state.configurationReads, 0)
    after.resetCounts()
    assert.deepEqual(JSON.parse((await response(after, "?id=UNKNOWN")).body), { athletes: [] })
    assert.equal(after.state.normalizations, 0); assert.equal(after.state.categoryCalls, 0); assert.equal(after.state.sortCalls, 0)
    assert.equal(after.state.convertedRows, 100)
  } finally { before.close(); after.close() }
})

test("GET individuel : mêmes 401/403/503 du vrai garde, révocation et pannes, aucun contournement d'accès", async () => {
  const before = await createAthleteDetailFixture(true), after = await createAthleteDetailFixture(false)
  try {
    for (const scenario of ["anonymous", "no-grant", "revoked", "disabled", "activation", "activation-temporary", "auth-source", "ATHLETES", "CATEGORIES_AGE"] as const) {
      for (const fixture of [before, after]) {
        fixture.resetCounts(); fixture.state.user = { ...fixture.user }; fixture.state.grants = [fixture.grant]; fixture.state.authUnavailable = false; fixture.state.failSheet = ""
        if (scenario === "anonymous") fixture.state.user = null
        if (scenario === "no-grant") fixture.state.grants = []
        if (scenario === "revoked") fixture.state.user!.sessionVersion++
        if (scenario === "disabled") fixture.state.user!.statut = "INACTIF"
        if (scenario === "activation") fixture.state.user!.doitChangerMotDePasse = true
        if (scenario === "activation-temporary") { fixture.state.user!.doitChangerMotDePasse = true; fixture.state.user!.dateExpirationAccesTemporaire = new Date((fixture.state.now + 3600) * 1000).toISOString() }
        if (scenario === "auth-source") fixture.state.authUnavailable = true
        if (scenario === "ATHLETES" || scenario === "CATEGORIES_AGE") fixture.state.failSheet = scenario
      }
      const result = await response(after, "?id=UNKNOWN")
      assert.deepEqual(result, await response(before, "?id=UNKNOWN"), scenario)
      assert.equal(result.status, ["anonymous", "revoked", "disabled", "activation"].includes(scenario) ? 401 : ["no-grant", "activation-temporary"].includes(scenario) ? 403 : 503, scenario)
      if (!["ATHLETES", "CATEGORIES_AGE"].includes(scenario)) assert.equal(after.state.sheetReads.length, 0, "aucune lecture avant autorisation")
    }
  } finally { before.close(); after.close() }
})
