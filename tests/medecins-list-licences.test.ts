import test from "node:test"
import assert from "node:assert/strict"
import { build } from "esbuild"
import { createRequire } from "node:module"

test("médecins : libellés des spécialités, clés conservées, licences en lot et détails sans relecture licences", async () => {
  const state = { reads: [] as string[], authenticated: true, failed: false }
  ;(globalThis as any).__doctorFixture = state
  const mocks: Record<string, string> = {
    "@/lib/auth/guard": "export const protectedRoute=handler=>handler",
    "@/lib/auth-session": "export const getSessionUser=async()=>globalThis.__doctorFixture.authenticated?{}:null",
    "@/lib/actors": `export const listActors=async()=>[
      {id:'D1',nomComplet:'Alpha',id_specialite_sante:'S1',specialite:'S1'},
      {id:'D2',nomComplet:'Bravo',id_specialite_sante:'S2',specialite:'S2'},
      {id:'D3',nomComplet:'Charlie',id_specialite_sante:'UNKNOWN',specialite:'UNKNOWN'},
      {id:'D4',nomComplet:'Delta',id_specialite_sante:'',specialite:''},
      {id:'D5',nomComplet:'Echo',id_specialite_sante:'',specialite:'Kinésithérapeute'}];`,
    "@/app/api/_actor-write": "export const handleActorWrite=()=>{throw Error('No writes')}",
    "@/lib/google-sheets": `export const appendSheetRowsAtomically=()=>{throw Error('No writes')};export const upsertSheetRowsAtomically=appendSheetRowsAtomically;export const pickFirst=()=>'';
      export async function readSheetRows({sheet}){const s=globalThis.__doctorFixture;s.reads.push(sheet);if(s.failed)throw Error('offline');
        if(sheet==='SPECIALITES_MEDECINS')return [{id_specialite:'S1',nom_specialite:'Urgentiste'},{id_specialite_sante:'S2',nom_specialite_sante:'Cardiologue'}];
        if(sheet==='STATUT_LICENCE')return [{id_statut_licence:'ACTIVE',nom_statut_licence:'ACTIVE'}];
        return [{id_acteur:'D1',id_type_acteur:'TAC005',numero_licence:'00123',date_debut_validite:'2000-01-01',date_fin_validite:'2999-12-31',id_statut_licence:'ACTIVE'},
          {id_acteur:'D2',id_type_acteur:'TAC002',numero_licence:'COACH',date_debut_validite:'2000-01-01',date_fin_validite:'2999-12-31',id_statut_licence:'ACTIVE'}];
      }`,
  }
  try {
    const compiled = await build({ entryPoints: ["app/api/medecins/route.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "fixture", setup(b) {
      b.onResolve({ filter: /^@\// }, a => a.path in mocks ? { path: a.path, namespace: "fixture" } : undefined)
      b.onLoad({ filter: /.*/, namespace: "fixture" }, a => ({ contents: mocks[a.path], loader: "js" }))
    } }] })
    const mod = { exports: {} as { GET: (r: Request) => Promise<Response> } }
    new Function("require", "module", "exports", compiled.outputFiles[0].text)(createRequire(process.cwd() + "/package.json"), mod, mod.exports)
    const get = (query = "") => mod.exports.GET(new Request("http://localhost/api/medecins" + query))
    const list = await (await get()).json()
    assert.deepEqual(list.medecins.map((row: any) => row.specialite), ["Urgentiste", "Cardiologue", "Spécialité non référencée", "", "Kinésithérapeute"])
    assert.equal(list.medecins[0].id_specialite_sante, "S1")
    assert.equal(list.medecins[0].licenceDisplay, "00123")
    assert.equal(list.medecins[1].licenceDisplay, "")
    assert.deepEqual(state.reads, ["ACTEURS_LICENCES", "STATUT_LICENCE", "SPECIALITES_MEDECINS"])
    assert.deepEqual((await (await get("?search=Urgentiste")).json()).medecins.map((row: any) => row.id), ["D1"])
    assert.equal((await (await get("?search=00123")).json()).medecins[0].id, "D1")
    const count = state.reads.length
    const detail = await (await get("?id=d1")).json()
    assert.equal(detail.medecins[0].specialite, "Urgentiste")
    assert.equal(detail.medecins[0].id_specialite_sante, "S1")
    assert.equal("licenceDisplay" in detail.medecins[0], false)
    assert.deepEqual(state.reads.slice(count), ["SPECIALITES_MEDECINS"])
    assert.equal((await (await get("?id=unknown")).json()).medecins.length, 0)
    const beforeAuth = state.reads.length
    state.authenticated = false; assert.equal((await get()).status, 401); assert.equal(state.reads.length, beforeAuth)
    state.authenticated = true; state.failed = true; assert.equal((await get()).status, 500)
  } finally { delete (globalThis as any).__doctorFixture }
})
