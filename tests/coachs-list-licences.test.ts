import test from "node:test"
import assert from "node:assert/strict"
import { build } from "esbuild"
import { createRequire } from "node:module"

test("liste coachs : licences en lot, recherche du numéro affiché et fiche sans relecture des licences", async () => {
  const reads: string[] = []
  ;(globalThis as any).__coachLicenceReads = reads
  const mocks: Record<string, string> = {
    "@/lib/auth/guard": "export const protectedRoute = handler => handler",
    "@/lib/auth-session": "export const getSessionUser = async () => ({role:'federal'})",
    "@/lib/actors": "export const listActors = async () => [{id:'COA1',nomComplet:'Alpha'}, {id:'COA2',nomComplet:'Bravo'}]",
    "@/app/api/_actor-write": "export const handleActorWrite = () => {throw Error('No writes')}",
    "@/lib/google-sheets": "export async function readSheetRows({sheet}){globalThis.__coachLicenceReads.push(sheet);return []}",
    "@/lib/coach-licence-index": "export const coachLicenceIndex = () => new Map([['COA1',{licenceNumero:'00123',licenceDisplay:'00123',licenceAmbiguous:false}]])",
  }
  try {
    const result = await build({ entryPoints: ["app/api/coachs/route.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "fixture", setup(builder) {
      builder.onResolve({ filter: /^@\// }, args => args.path in mocks ? { path: args.path, namespace: "fixture" } : undefined)
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: mocks[args.path], loader: "js" }))
    } }] })
    const mod = { exports: {} as { GET: (request: Request) => Promise<Response> } }
    new Function("require", "module", "exports", result.outputFiles[0].text)(createRequire(process.cwd() + "/package.json"), mod, mod.exports)
    const get = async (query = "") => {
      const response = await mod.exports.GET(new Request("http://localhost/api/coachs" + query))
      assert.equal(response.status, 200)
      return response.json()
    }
    const list = await get()
    assert.deepEqual(list.coachs.map((row: any) => row.id), ["COA1", "COA2"])
    assert.equal(list.coachs[0].licenceDisplay, "00123")
    assert.equal(list.coachs[1].licenceDisplay, "")
    assert.deepEqual(reads, ["ACTEURS_LICENCES", "STATUT_LICENCE"])
    assert.deepEqual((await get("?search=00123")).coachs.map((row: any) => row.id), ["COA1"])
    assert.equal((await get("?search=COA1")).coachs.length, 0)
    const count = reads.length
    const detail = await get("?id=COA1")
    assert.equal(detail.coachs[0].id, "COA1")
    assert.equal("licenceDisplay" in detail.coachs[0], false)
    assert.equal(reads.length, count)
  } finally { delete (globalThis as any).__coachLicenceReads }
})
