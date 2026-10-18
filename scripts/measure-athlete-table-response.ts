import { gzipSync, brotliCompressSync, constants } from "node:zlib"
import { createRequire } from "node:module"
import { resolve } from "node:path"
import { projectAthleteTableRow, ATHLETE_TABLE_FIELDS } from "../lib/athlete-table"
import { createAthleteDetailFixture, syntheticAthleteValues } from "../tests/helpers/athlete-detail-fixture"

async function payloads() {
  if (!process.argv.includes("--sheets")) {
    const fixture = await createAthleteDetailFixture(false, syntheticAthleteValues(26199), false)
    try {
      const full = await fixture.request(""), table = await fixture.request("?view=table")
      if (full.status !== 200 || table.status !== 200) throw Error("Fixture response failed")
      return { source: "synthetic-in-process-API", full: await full.json(), table: await table.json() }
    } finally { fixture.close() }
  }
  const envRoot = process.argv[process.argv.indexOf("--env-root") + 1]
  if (!process.argv.includes("--env-root") || !envRoot) throw Error("Explicit environment root required for Sheets")
  const appRequire = createRequire(resolve("package.json"))
  const { loadEnvConfig } = createRequire(appRequire.resolve("next/package.json"))("@next/env")
  loadEnvConfig(envRoot, false, { info() {}, error() {} })
  const [{listActors}, {readSheetRows}, {loadSeasonSettings}, domain, {resolveAthleteAgeCategory}] = await Promise.all([
    import("../lib/actors"), import("../lib/google-sheets"), import("../lib/current-season"), import("../lib/current-season-domain"), import("../lib/athlete-age-category"),
  ])
  const [actors, categories, settings] = await Promise.all([
    listActors("athletes"), readSheetRows({block:"referentiel",sheet:"CATEGORIES_AGE",range:"A:F"}), loadSeasonSettings(),
  ])
  const licences = settings.currentSeasonId ? await readSheetRows({block:"licences",sheet:"ATHLETE_LICENCES",range:"A:ZZ"}) : []
  const index = domain.currentSeasonLicenceIndex(licences,settings.currentSeasonId)
  const athletes = actors.map(actor => ({...actor,categorie:resolveAthleteAgeCategory(actor.dateNaissance||actor.date_de_naissance,categories).label,...(index.get(actor.id)||domain.missingSeasonLicence)}))
  return {source:"read-only-real-Sheets-federal-response-reconstruction",full:{athletes,currentSeason:settings.currentSeason},table:{athletes:athletes.map(projectAthleteTableRow),currentSeason:settings.currentSeason}}
}

async function main() {
  const {source,full,table}=await payloads()
  if(JSON.stringify({...full,athletes:full.athletes.map(projectAthleteTableRow)})!==JSON.stringify(table)) throw Error("Projection mismatch")
  const measure=(payload:unknown)=>{
    const bytes=Buffer.from(JSON.stringify(payload),"utf8")
    return {jsonUtf8Bytes:bytes.length,gzipLevel6Bytes:gzipSync(bytes,{level:6}).length,brotliQuality4Bytes:brotliCompressSync(bytes,{params:{[constants.BROTLI_PARAM_QUALITY]:4}}).length}
  }
  const before=measure(full),after=measure(table)
  console.log(JSON.stringify({source,measuredUtc:new Date().toISOString(),rows:full.athletes.length,fieldsBefore:Object.keys(full.athletes[0]||{}).length,fieldsAfter:Object.keys(table.athletes[0]||{}).length,allowlist:ATHLETE_TABLE_FIELDS,before,after,reductionPercent:Object.fromEntries(Object.keys(before).map(key=>[key,Number((100*(1-after[key as keyof typeof after]/before[key as keyof typeof before])).toFixed(2))])),sameRowsAndOrder:true,sameRetainedValues:true,sameEnvelope:true,personalDataPrinted:false,limits:"Local serialization/compression; not a production HTTP capture or measured Vercel CPU saving. Sheets reconstruction uses the existing local workbook configuration and the federal full dataset."}))
}
main().catch(()=>{console.error("Response volume measurement failed; source unavailable or equivalence failed. No personal data displayed.");process.exitCode=1})
