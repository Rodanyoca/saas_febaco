import test from "node:test"
import assert from "node:assert/strict"
import { sortActorsAlphabetically } from "../lib/actors"
import { sortAthletesAlphabetically } from "../lib/athlete-sort"
import { build } from "esbuild"
import { createRequire } from "node:module"

test("le tri athlète conserve exactement l’ordre antérieur, accents, ponctuation et noms vides", () => {
  const names = ["Élodie", "elodie", "ÉLODIE", "E\u0301lodie", "Anne-Marie", "Anne Marie", "AnneMarie", "Anne.Marie", "O’Neil", "O'Neil", "ONeil", "œuvre", "oeuvre", "Ægir", "aegir", "", "", " ", "Jean 2", "Jean 10", "béatrice", "Zola", "123", "--", "王", "🙂"]
  const rows = names.map((nom_complet, index) => ({ id: `ID-${names.length - index}`, nom_complet, marker: String(index) }))
  for (const input of [rows, [...rows].reverse(), [...rows.slice(10), ...rows.slice(0, 10)]]) {
    const original = [...input], before = sortActorsAlphabetically(input), after = sortAthletesAlphabetically(input)
    assert.deepEqual(after.map(row => row.id), before.map(row => row.id))
    assert.deepEqual(after, before)
    assert.equal(after.length, input.length)
    assert.equal(new Set(after).size, input.length)
    assert.ok(after.every((row, index) => row === before[index]), "conserve aussi les objets et leur ordre")
    assert.deepEqual(input, original, "ne modifie pas le tableau d’entrée")
  }
  assert.deepEqual(sortAthletesAlphabetically([]), [])
})

test("aucun départage ajouté par identifiant lorsque la collation considère les noms égaux", () => {
  const input = [{ id: "Z", nom_complet: "Élodie" }, { id: "A", nom_complet: "elodie" }, { id: "M", nom_complet: "ÉLODIE" }]
  assert.deepEqual(sortActorsAlphabetically(input).map(row => row.id), ["Z", "A", "M"])
  assert.deepEqual(sortAthletesAlphabetically(input).map(row => row.id), ["Z", "A", "M"])
})

test("listActors utilise le nouveau tri uniquement pour les athlètes", async () => {
  const fixture = { athleteSortCalls: 0 }
  ;(globalThis as any).__athleteSortFixture = fixture
  const mocks: Record<string, string> = {
    "@/lib/google-sheets": `
      export const pickFirst=(row,keys)=>keys.map(key=>row[key]).find(value=>String(value??'').trim())||'';
      export async function readSheetRows({sheet}) {
        const keys={ATHLETES:'id_athlete',COACHS:'id_coach',OFFICIELS:'id_officiel',ARBITRES:'id_arbitre',MEDECINS:'id_medecin',AUTRES:'id_autre_acteur'};
        return keys[sheet]?[{[keys[sheet]]:'Z',nom_complet:'Zulu'},{[keys[sheet]]:'A',nom_complet:'Alpha'}]:[];
      }
      export const writeSheetRowByHeaders=()=>{throw Error('No writes in test')};
    `,
    "@/lib/athlete-sort": "export function sortAthletesAlphabetically(rows){globalThis.__athleteSortFixture.athleteSortCalls++;return [...rows]}",
  }
  try {
    const result = await build({ entryPoints: ["lib/actors.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "sort-scope-fixture", setup(builder) {
      builder.onResolve({ filter: /^@\// }, args => args.path in mocks ? { path: args.path, namespace: "fixture" } : undefined)
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: mocks[args.path], loader: "js" }))
    } }] })
    const mod = { exports: {} as { listActors: (kind: string) => Promise<Array<{ id: string }>> } }
    new Function("require", "module", "exports", result.outputFiles[0].text)(createRequire(process.cwd() + "/package.json"), mod, mod.exports)
    assert.deepEqual((await mod.exports.listActors("athletes")).map(row => row.id), ["Z", "A"], "passe par le helper dédié substitué dans ce test")
    for (const kind of ["coachs", "officiels", "arbitres", "medecins", "autres"]) {
      assert.deepEqual((await mod.exports.listActors(kind)).map(row => row.id), ["A", "Z"], "conserve le tri partagé antérieur")
    }
    assert.equal(fixture.athleteSortCalls, 1)
  } finally { delete (globalThis as any).__athleteSortFixture }
})
