import test from "node:test"
import assert from "node:assert/strict"
import { build } from "esbuild"
import { createRequire } from "node:module"
import { readFile } from "node:fs/promises"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { compareLicenceNumbers } from "../lib/current-season-domain"
import { createAthleteDetailFixture, syntheticAthleteValues } from "./helpers/athlete-detail-fixture"

test("actual desktop/mobile table: same rendering, search, filters, licence sorts and local pages",async()=>{
  const values=syntheticAthleteValues(40)
  values.slice(1).forEach((row,i)=>{row[10]=i%3?"ACTIF":"INACTIF";row[12]="https://example.invalid/synthetic-avatar.png"})
  const fixture=await createAthleteDetailFixture(false,values,false)
  const state={pageValues:[] as unknown[],tableValues:[] as unknown[],pageIndex:0,tableIndex:0}
  ;(globalThis as any).__athleteTableRender=state
  try {
    fixture.state.licenceValues=[["id_athlete","id_saison","numero_licence","id_statut_licence"],...Array.from({length:40},(_,i)=>[`ATH${String(i).padStart(5,"0")}`,"S1",String(40-i).padStart(3,"0"),"STL001"])]
    const full=await (await fixture.request("")).json(),compact=await (await fixture.request("?view=table")).json()
    const compiled=await build({entryPoints:["app/dashboard/athletes/page.tsx"],bundle:true,write:false,platform:"node",format:"cjs",packages:"external",plugins:[{name:"SSR-input-state",setup(b){
      b.onResolve({filter:/^react$/},a=>/[\\/]app[\\/]dashboard[\\/]athletes[\\/]page\.tsx$/.test(a.importer)?{path:"page",namespace:"hooks"}:/[\\/]components[\\/]dashboard[\\/]data-table\.tsx$/.test(a.importer)?{path:"table",namespace:"hooks"}:undefined)
      b.onLoad({filter:/.*/,namespace:"hooks"},a=>({loader:"js",resolveDir:process.cwd(),contents:`export {useEffect,useMemo,useId} from 'react';export function useState(initial){const s=globalThis.__athleteTableRender;return [s.${a.path}Values[s.${a.path}Index++],()=>{}]}`}))
      b.onResolve({filter:/^@\/components\/dashboard\/(header|actor-editor)$/},a=>({path:a.path,namespace:"unused-shell"}))
      b.onLoad({filter:/.*/,namespace:"unused-shell"},()=>({loader:"js",contents:"export const Header=()=>null;export const ActorEditor=()=>null"}))
    }}]})
    const mod={exports:{} as {default:()=>ReturnType<typeof createElement>}}
    new Function("require","module","exports",compiled.outputFiles[0].text)(createRequire(process.cwd()+"/package.json"),mod,mod.exports)
    function render(rows:any[],query:string,filters:Record<string,string>,sort:string,page:number,size:number){
      state.pageIndex=0;state.tableIndex=0
      state.pageValues=[rows,filters,full.currentSeason,false,"",sort,0]
      state.tableValues=[query,{},page,size]
      return renderToStaticMarkup(createElement(mod.exports.default))
    }
    const scenarios: Array<{search:string;filters:Record<string,string>;sort:string;page:number;size:number}> = [
      {search:"",filters:{},sort:"name",page:1,size:10},
      {search:"",filters:{},sort:"name",page:2,size:10},
      {search:"",filters:{},sort:"licence-asc",page:2,size:10},
      {search:"",filters:{sexe:"F"},sort:"licence-desc",page:1,size:10},
      {search:"",filters:{statut:"INACTIF"},sort:"name",page:1,size:25},
      {search:"001",filters:{statut:"ACTIF"},sort:"licence-asc",page:1,size:25},
      {search:"SYNTH",filters:{sexe:"M",statut:"ACTIF"},sort:"name",page:2,size:10},
      {search:"absent-synthetic-value",filters:{},sort:"name",page:1,size:10},
    ]
    for(const scenario of scenarios) {
      const {search,filters,sort,page,size}=scenario
      const before=render(full.athletes,search,filters,sort,page,size),after=render(compact.athletes,search,filters,sort,page,size)
      assert.equal(after,before,JSON.stringify(scenario))
      assert.match(after,/md:hidden/);assert.match(after,/hidden md:block/)
      const searchKeys=["licenceDisplay","nomComplet","sexe","dateNaissance","idNational","idFiba","statut"]
      const expected=[...full.athletes].sort((a,b)=>sort==="name"?String(a.nomComplet||"").localeCompare(String(b.nomComplet||""),"fr",{sensitivity:"base"}):compareLicenceNumbers(a,b,sort==="licence-desc"?"desc":"asc"))
        .filter(row=>searchKeys.some(key=>String(row[key]).toLowerCase().includes(search.toLowerCase()))&&Object.entries(filters).every(([key,value])=>row[key]===value))
        .slice((page-1)*size,page*size)
      assert.equal((after.match(/href="\/dashboard\/athletes\/[^"]+"/g)||[]).length,expected.length*2,"both responsive renderings use the same local page")
      for(const row of expected)assert.ok(after.includes(`/dashboard/athletes/${encodeURIComponent(row.id)}`))
    }
    assert.match(await readFile("app/dashboard/athletes/page.tsx","utf8"),/fetch\("\/api\/athletes\?view=table"/)
  } finally {fixture.close();delete (globalThis as any).__athleteTableRender}
})
