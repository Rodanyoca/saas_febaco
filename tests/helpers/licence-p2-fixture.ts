import { build } from "esbuild"
import { readFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { resolve } from "node:path"
import type * as Service from "../../lib/licences"

export async function licenceModule(before: boolean, probes = false) {
  const entry = before ? "tests/fixtures/licences-before-p2.ts" : "lib/licences.ts"
  const compiled = await build({ entryPoints: [entry], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{
    name: "licence-test-only-probes", setup(b) {
      b.onLoad({ filter: /(?:licences|licences-before-p2)\.ts$/ }, async args => {
        let source = await readFile(args.path, "utf8")
        if (probes) {
          source = source.replace("const affiliation = maps.affiliations.get(clean(row.id_affiliation_athlete))", "__views++; const affiliation = maps.affiliations.get(clean(row.id_affiliation_athlete))")
          source = source.replace("const teams = data.teams.map", "__summaries++; const teams = data.teams.map")
        }
        return { contents: "let __views=0, __summaries=0;\n" + source + "\nexport const counts=()=>({views:__views,summaries:__summaries}); export const reset=()=>{__views=0;__summaries=0}", loader: "ts", resolveDir: resolve(args.path, "..") }
      })
    },
  }] })
  const mod = { exports: {} }
  new Function("require", "module", "exports", compiled.outputFiles[0].text)(createRequire(resolve("package.json")), mod, mod.exports)
  return mod.exports as typeof Service & { counts: () => { views: number; summaries: number }; reset: () => void }
}
