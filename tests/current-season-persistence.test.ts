import test from "node:test"
import assert from "node:assert/strict"
import { build } from "esbuild"
import { createRequire } from "node:module"
import { SETTINGS_HEADERS } from "../lib/current-season-domain"

test("persistance de saison : cellule unique, en-têtes réordonnés, invalidation et refus des conflits", async () => {
  const headers = ["description", "modifie_par", "cle_parametre", "date_modification", "type_valeur", "valeur_parametre"]
  const originalEnv = process.env.GOOGLE_SHEETS_REFERENTIEL_ID
  process.env.GOOGLE_SHEETS_REFERENTIEL_ID = "synthetic-workbook"
  const state = {
    values: [headers, ["Other parameter", "", "OTHER", "", "STRING", "keep"], ["Season", "", "SAISON_COURANTE", "", "STRING", ""]],
    seasons: [{ id_saison: "S1", nom_saison: "Première" }, { id_saison: "S2", nom_saison: "Deuxième" }],
    reads: [] as boolean[], writes: 0, invalidations: [] as string[], unavailable: false,
  }
  ;(globalThis as any).__seasonPersistenceFixture = state
  const mocks: Record<string, string> = {
    "./google-sheets": `
      export async function readSheetRowsBatch(options) {
        const s=globalThis.__seasonPersistenceFixture; s.reads.push(options.fresh);
        if(s.unavailable)throw Error('offline');
        const [headers,...rows]=s.values;
        return {SAISON:s.seasons,PARAMETRES_SYSTEME:rows.map(row=>Object.fromEntries(headers.map((h,i)=>[h,row[i]||''])))};
      }
      export function invalidateSheetReadCache(block,sheet){globalThis.__seasonPersistenceFixture.invalidations.push(block+':'+sheet)}
    `,
    "./google-clients": `
      export function getSheetsReadClient(){return {spreadsheets:{values:{get:async()=>({data:{values:globalThis.__seasonPersistenceFixture.values.map(row=>[...row])}})}}}}
      export function getSheetsWriteClient(){return {spreadsheets:{values:{batchUpdate:async({requestBody})=>{
        const s=globalThis.__seasonPersistenceFixture; s.writes++;
        for(const update of requestBody.data){const match=update.range.match(/!([A-Z]+)([0-9]+)$/);let col=0;for(const c of match[1])col=col*26+c.charCodeAt(0)-64;s.values[Number(match[2])-1][col-1]=update.values[0][0]}
      }}}}}
    `,
  }
  try {
    const result = await build({ entryPoints: ["lib/current-season.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "fixture", setup(builder) {
      builder.onResolve({ filter: /^\.\/google-(sheets|clients)$/ }, args => ({ path: args.path, namespace: "fixture" }))
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: mocks[args.path], loader: "js" }))
    } }] })
    const mod = { exports: {} as { loadSeasonSettings: () => Promise<any>; saveCurrentSeason: (id: unknown, expected: unknown, actor: string) => Promise<any> } }
    new Function("require", "module", "exports", result.outputFiles[0].text)(createRequire(process.cwd() + "/package.json"), mod, mod.exports)
    assert.equal((await mod.exports.loadSeasonSettings()).currentSeason, null)
    assert.equal((await mod.exports.saveCurrentSeason("S1", "", "ADMIN-TEST")).currentSeasonId, "S1")
    assert.equal((await mod.exports.saveCurrentSeason("S2", "S1", "ADMIN-TEST")).currentSeasonId, "S2")
    assert.equal(state.values.length, 3)
    assert.deepEqual(state.values[0], headers)
    assert.deepEqual(state.values[1], ["Other parameter", "", "OTHER", "", "STRING", "keep"])
    assert.equal(state.values[2][2], "SAISON_COURANTE")
    assert.equal(state.values[2][4], "STRING")
    assert.equal(state.values[2][5], "S2")
    assert.equal(state.writes, 2)
    assert.deepEqual(state.invalidations, ["referentiel:PARAMETRES_SYSTEME", "referentiel:PARAMETRES_SYSTEME"])
    assert.ok(state.reads.every(Boolean), "configuration must bypass caches on every request")
    await assert.rejects(mod.exports.saveCurrentSeason("S1", "", "ADMIN-TEST"), { code: "SAISON_MODIFIEE" })
    await assert.rejects(mod.exports.saveCurrentSeason("BAD", "S2", "ADMIN-TEST"), { code: "SAISON_INCONNUE" })
    const competing = await Promise.allSettled([mod.exports.saveCurrentSeason("S1", "S2", "ADMIN-TEST"), mod.exports.saveCurrentSeason("S2", "S2", "ADMIN-TEST")])
    assert.equal(competing.filter(result => result.status === "fulfilled").length, 1)
    assert.equal(state.values.length, 3)
    state.values.push([...state.values[2]])
    await assert.rejects(mod.exports.saveCurrentSeason("S2", "S1", "ADMIN-TEST"), { code: "PARAMETRE_AMBIGU" })
    state.unavailable = true
    await assert.rejects(mod.exports.loadSeasonSettings(), { code: "PARAMETRES_INDISPONIBLES", status: 503 })
    assert.equal(state.writes, 3)
    assert.equal(SETTINGS_HEADERS.length, 6)
  } finally {
    delete (globalThis as any).__seasonPersistenceFixture
    if (originalEnv === undefined) delete process.env.GOOGLE_SHEETS_REFERENTIEL_ID; else process.env.GOOGLE_SHEETS_REFERENTIEL_ID = originalEnv
  }
})
