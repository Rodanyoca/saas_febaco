import test from "node:test"
import assert from "node:assert/strict"
import { build } from "esbuild"
import { createRequire } from "node:module"
import { actorLicenceIndex, coachLicenceIndex } from "../lib/coach-licence-index"

const statuses = [{ id_statut_licence: "ACTIVE", nom_statut_licence: "ACTIVE" }, { id_statut_licence: "SUSP", nom_statut_licence: "SUSPENDUE" }]
const licence = (id: string, number: string, type = "TAC004", start = "2000-01-01", end = "2999-12-31", status = "ACTIVE") => ({ id_acteur: id, numero_licence: number, id_type_acteur: type, date_debut_validite: start, date_fin_validite: end, id_statut_licence: status })

test("arbitres: current licence, other families excluded, expiry, suspension and ambiguity", () => {
  const rows = [licence("R1", "00123"), licence("R1", "COACH", "TAC002"), licence("R2", "OLD", "TAC004", "2000-01-01", "2001-01-01"), licence("R3", "SUSPENDED", "TAC004", "2000-01-01", "2999-12-31", "SUSP"), licence("R4", "1"), licence("R4", "2"), licence("R5", "FUTURE", "TAC004", "2998-01-01"), licence("R6", "BOUND", "TAC004", "2026-10-18", "2026-10-18")]
  const index = actorLicenceIndex(rows, statuses, "TAC004", "2026-10-18")
  assert.equal(index.get("R1")?.licenceDisplay, "00123")
  assert.equal(index.get("R6")?.licenceDisplay, "BOUND")
  for (const id of ["R2", "R3", "R5"]) assert.equal(index.has(id), false)
  assert.deepEqual(index.get("R4"), { licenceDisplay: "", licenceNumero: "", licenceAmbiguous: true })
  assert.equal(coachLicenceIndex(rows, statuses, "2026-10-18").get("R1")?.licenceDisplay, "COACH")
})

test("arbitres API: batch reads, displayed licence search, detail without licence reload, auth and failures", async () => {
  const state = { reads: [] as string[], authenticated: true, failed: false }
  ;(globalThis as any).__arbitreLicenceFixture = state
  const mocks: Record<string, string> = {
    "@/lib/auth/guard": "export const protectedRoute = handler => handler",
    "@/lib/auth-session": "export const getSessionUser = async () => globalThis.__arbitreLicenceFixture.authenticated?{role:'federal'}:null",
    "@/lib/actors": "export const listActors = async () => [{id:'R1',nomComplet:'Alpha'},{id:'R2',nomComplet:'Bravo'},{id:'R3',nomComplet:'Charlie'}]",
    "@/app/api/_actor-write": "export const handleActorWrite = () => {throw Error('No writes')}",
    "@/lib/google-sheets": `export const appendSheetRowsAtomically=()=>{throw Error('No writes')};export const upsertSheetRowsAtomically=appendSheetRowsAtomically;export const pickFirst=()=>'';export async function readSheetRows({sheet}){const s=globalThis.__arbitreLicenceFixture;s.reads.push(sheet);if(s.failed)throw Error('offline');return sheet==='STATUT_LICENCE'?${JSON.stringify(statuses)}:${JSON.stringify([licence("R1", "00123"), licence("R2", "COACH", "TAC002"), licence("R3", "X"), licence("R3", "Y")])}}`,
  }
  try {
    const result = await build({ entryPoints: ["app/api/arbitres/route.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "fixture", setup(b) {
      b.onResolve({ filter: /^@\// }, a => a.path in mocks ? { path: a.path, namespace: "fixture" } : undefined)
      b.onLoad({ filter: /.*/, namespace: "fixture" }, a => ({ contents: mocks[a.path], loader: "js" }))
    } }] })
    const mod = { exports: {} as { GET: (r: Request) => Promise<Response> } }
    new Function("require", "module", "exports", result.outputFiles[0].text)(createRequire(process.cwd() + "/package.json"), mod, mod.exports)
    const get = (q = "") => mod.exports.GET(new Request("http://localhost/api/arbitres" + q))
    const list = await (await get()).json()
    assert.equal(list.arbitres[0].licenceDisplay, "00123")
    assert.equal(list.arbitres[1].licenceDisplay, "")
    assert.equal(list.arbitres[2].licenceAmbiguous, true)
    assert.deepEqual(state.reads, ["ACTEURS_LICENCES", "STATUT_LICENCE"])
    assert.deepEqual((await (await get("?search=00123")).json()).arbitres.map((r: any) => r.id), ["R1"])
    assert.equal((await (await get("?search=COACH")).json()).arbitres.length, 0)
    const count = state.reads.length
    assert.equal((await (await get("?id=r1")).json()).arbitres[0].id, "R1")
    assert.equal((await (await get("?id=unknown")).json()).arbitres.length, 0)
    assert.equal(state.reads.length, count)
    state.authenticated = false; assert.equal((await get()).status, 401); assert.equal(state.reads.length, count)
    state.authenticated = true; state.failed = true; assert.equal((await get()).status, 500)
  } finally { delete (globalThis as any).__arbitreLicenceFixture }
})
