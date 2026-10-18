import test from "node:test"
import assert from "node:assert/strict"
import { build } from "esbuild"
import { createRequire } from "node:module"

test("API athlètes : saison persistée, lot unique, recherche/tri sur licence, liens techniques inchangés", async () => {
  const state = {
    seasonId: "S1", configurationReads: 0, licenceReads: 0,
    licences: [
      { id_athlete: "ATH-Z", id_saison: "S1", numero_licence: "010", id_statut_licence: "STL001" },
      { id_athlete: "ATH-A", id_saison: "S1", numero_licence: "2", id_statut_licence: "STL001" },
      { id_athlete: "ATH-Z", id_saison: "S2", numero_licence: "999", id_statut_licence: "STL001" },
    ],
  }
  ;(globalThis as any).__athleteSeasonApiFixture = state
  const mocks: Record<string, string> = {
    "@/lib/auth/guard": "export const protectedRoute = handler => handler",
    "@/lib/auth-session": "export const getSessionUser = async () => ({role:'federal'})",
    "@/lib/actors": "export const listActors = async () => [{id:'ATH-Z',nomComplet:'Zulu'}, {id:'ATH-A',nomComplet:'Alpha'}, {id:'ATH-MISSING',nomComplet:'Missing'}]",
    "@/app/api/_actor-write": "export const handleActorWrite = () => {throw Error('No writes in test')}",
    "@/lib/google-sheets": "export async function readSheetRows({sheet}){const s=globalThis.__athleteSeasonApiFixture;if(sheet==='ATHLETE_LICENCES'){s.licenceReads++;return s.licences}return []}",
    "@/lib/athlete-age-category": "export const resolveAthleteAgeCategory=()=>({label:'Non définie'})",
    "@/lib/current-season": "export async function loadSeasonSettings(){const s=globalThis.__athleteSeasonApiFixture;s.configurationReads++;return {currentSeasonId:s.seasonId,currentSeason:s.seasonId?{id:s.seasonId,label:s.seasonId}:null}}",
  }
  try {
    const result = await build({ entryPoints: ["app/api/athletes/route.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "fixture", setup(builder) {
      builder.onResolve({ filter: /^@\// }, args => args.path in mocks ? { path: args.path, namespace: "fixture" } : undefined)
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: mocks[args.path], loader: "js" }))
    } }] })
    const mod = { exports: {} as { GET: (request: Request) => Promise<Response> } }
    new Function("require", "module", "exports", result.outputFiles[0].text)(createRequire(process.cwd() + "/package.json"), mod, mod.exports)
    const get = async (query = "") => {
      const response = await mod.exports.GET(new Request("http://localhost/api/athletes" + query))
      assert.equal(response.status, 200)
      return response.json()
    }
    const first = await get("?sort=licence")
    assert.deepEqual(first.athletes.map((row: any) => row.id), ["ATH-A", "ATH-Z", "ATH-MISSING"])
    assert.equal(first.athletes[1].licenceDisplay, "010")
    assert.equal(first.athletes[2].licenceDisplay, "")
    assert.equal(state.configurationReads, 1)
    assert.equal(state.licenceReads, 1)
    assert.equal((await get("?search=010")).athletes[0].id, "ATH-Z")
    assert.equal((await get("?search=999")).athletes.length, 0, "old-season number must not match")
    assert.equal((await get("?search=ATH-Z")).athletes.length, 0, "hidden technical key must not substitute displayed licence")
    state.seasonId = "S2"
    const second = await get()
    assert.equal(second.currentSeason.id, "S2")
    assert.equal(second.athletes[0].id, "ATH-Z")
    assert.equal(second.athletes[0].licenceDisplay, "999")
    assert.equal(second.athletes[1].licenceDisplay, "")
    const before = { settings: state.configurationReads, licences: state.licenceReads }
    assert.equal((await get("?id=ATH-Z")).athletes[0].id, "ATH-Z")
    assert.equal(state.configurationReads, before.settings, "detail lookup does not reload season settings")
    assert.equal(state.licenceReads, before.licences)
    state.seasonId = ""
    const empty = await get()
    assert.equal(empty.currentSeason, null)
    assert.ok(empty.athletes.every((row: any) => row.licenceDisplay === ""))
    assert.equal(state.licenceReads, before.licences, "no licence reads without an explicit season")
  } finally { delete (globalThis as any).__athleteSeasonApiFixture }
})
