import { build } from "esbuild"
import { readFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { resolve } from "node:path"
import type { listAffiliations, mutateAffiliation } from "../../lib/affiliations"

export type AffiliationModule = {
  listAffiliations: typeof listAffiliations
  mutateAffiliation: typeof mutateAffiliation
  enriched: () => number
  resetEnriched: () => void
}

// La baseline est une copie exacte du service du SHA dc467a6 ; aucun accès Google.
// Les compteurs ne sont injectés que dans les tests, jamais dans l'application/benchmark.
export async function affiliationModule(before: boolean, probes = false): Promise<AffiliationModule> {
  const entry = before ? "tests/fixtures/affiliations-before-p1.ts" : "lib/affiliations.ts"
  const compiled = await build({ entryPoints: [entry], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{
    name: "affiliation-enrichment-probe",
    setup(builder) {
      builder.onLoad({ filter: /(?:affiliations|affiliations-before-p1)\.ts$/ }, async args => {
        let source = await readFile(args.path, "utf8")
        if (probes) {
          const marker = "const actorId = clean(row[config.actor]), actor = actorById.get(actorId)"
          if (!source.includes(marker)) throw Error("Marqueur enrichissement introuvable")
          source = source.replace(marker, "__enrichedCount++; " + marker)
        }
        return { loader: "ts", contents: "let __enrichedCount=0;\n" + source + "\nexport const enriched=()=>__enrichedCount; export const resetEnriched=()=>{__enrichedCount=0}", resolveDir: resolve(args.path, "..") }
      })
    },
  }] })
  const module = { exports: {} }
  new Function("require", "module", "exports", compiled.outputFiles[0].text)(createRequire(resolve("package.json")), module, module.exports)
  return module.exports as AffiliationModule
}
