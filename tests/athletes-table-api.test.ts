import test from "node:test"
import assert from "node:assert/strict"
import { ATHLETE_TABLE_FIELDS, projectAthleteTableRow } from "../lib/athlete-table"
import { buildScopeIndex } from "../lib/auth/territorial-scope"
import { createAthleteDetailFixture, syntheticAthleteValues } from "./helpers/athlete-detail-fixture"

const licenceValues = [
  ["id_athlete", "id_saison", "numero_licence", "id_statut_licence", "id_affiliation_athlete"],
  ["ATH00001", "S1", "010", "STL001", "A1"], ["ATH00002", "S1", "2", "STL001", "A2"],
  ["ATH00003", "S1", "OLD", "STL002", "A3"], ["ATH00004", "S1", "11", "STL001", "A4"],
  ["ATH00004", "S1", "12", "STL001", "A4"], ["ATH00005", "S2", "999", "STL001", "A5"],
]
const territory = {
  LIGUES: [{id_ligue:"L1"},{id_ligue:"L2"}], ENTENTES: [{id_entente:"E1",id_ligue:"L1"},{id_entente:"E2",id_ligue:"L1"},{id_entente:"E3",id_ligue:"L2"}],
  CLUBS: [{id_club:"C1",id_entente:"E1"},{id_club:"C2",id_entente:"E2"},{id_club:"C3",id_entente:"E3"}],
  EQUIPES: [{id_equipe:"T1",id_club:"C1"},{id_equipe:"T2",id_club:"C2"},{id_equipe:"T3",id_club:"C3"}],
  ATHLETE_AFFILIATIONS: Array.from({length:6},(_,i)=>({id_athlete:`ATH0000${i+1}`,id_affiliation_athlete:`A${i+1}`,id_equipe:i<2?"T1":i<4?"T2":"T3"})),
}
async function response(f: Awaited<ReturnType<typeof createAthleteDetailFixture>>, query: string) {
  const r = await f.request(query)
  return {status:r.status, cache:r.headers.get("cache-control"), type:r.headers.get("content-type"), body:await r.text()}
}

test("table: opt-in only, identical full/detail responses, rows/order/envelope, licences and real scopes", async () => {
  const values = syntheticAthleteValues(9)
  const duplicate=[...values[2]];duplicate[1]="Duplicate name";values.push(duplicate)
  const before=await createAthleteDetailFixture(false,values,true,"tests/fixtures/athletes-before-table.ts")
  const after=await createAthleteDetailFixture(false,values)
  try {
    for(const f of [before,after]) f.state.licenceValues=licenceValues
    for(const attachment of [{},{idLigue:"L1"},{idLigue:"L1",idEntente:"E1"},{idLigue:"L1",idEntente:"E2"},{idLigue:"L2",idEntente:"E3"}]) {
      for(const f of [before,after]) {f.state.user={...f.user,...attachment};f.state.scope="idLigue" in attachment?buildScopeIndex(f.state.user,territory):null}
      const scoped=JSON.parse((await response(after,"?view=table")).body).athletes
      const league="idLigue" in attachment?attachment.idLigue:undefined,entente="idEntente" in attachment?attachment.idEntente:undefined
      const allowed=league==="L2"?["ATH00005","ATH00006"]:entente==="E1"?["ATH00001","ATH00002"]:entente==="E2"?["ATH00003","ATH00004"]:league==="L1"?["ATH00001","ATH00002","ATH00003","ATH00004"]:null
      if(allowed) {
        assert.ok(scoped.every((row:any)=>allowed.includes(row.id)))
        assert.equal(scoped.length,allowed.length+(allowed.includes("ATH00001")?1:0))
      } else assert.equal(scoped.length,10)
      for(const query of ["","?view=full","?view=unknown","?view=TABLE","?search=010","?sort=licence","?sort=licence&direction=desc","?id=ATH00001","?id=UNKNOWN","?id=ATH00006","?id=ath00001&search=010","?id=ATH00001&id=ATH00002"]) {
        assert.deepEqual(await response(after,query),await response(before,query),query)
      }
      for(const query of ["","&search=010","&search=999","&search=absent","&sort=licence","&sort=licence&direction=desc","&id=","&id=%20%20"]) {
        const full=await response(after,query?"?"+query.slice(1):"")
        const table=await response(after,"?view=table"+query)
        assert.equal(table.status,200);assert.equal(table.cache,full.cache);assert.equal(table.type,full.type)
        const fullBody=JSON.parse(full.body),tableBody=JSON.parse(table.body)
        assert.deepEqual(tableBody,{...fullBody,athletes:fullBody.athletes.map(projectAthleteTableRow)})
        assert.deepEqual(tableBody.athletes.map((r:any)=>r.id),fullBody.athletes.map((r:any)=>r.id))
        assert.ok(tableBody.athletes.every((r:any)=>Object.keys(r).every(key=>(ATHLETE_TABLE_FIELDS as readonly string[]).includes(key))))
        assert.ok(tableBody.athletes.every((r:any)=>!("email" in r)&&!("numero_passeport" in r)&&!("observations" in r)))
      }
      for(const query of ["?id=ATH00001","?id=%20ath00001%20","?id=UNKNOWN","?id=ATH00006","?id=ATH00001&search=absent","?id=ATH00001&sort=licence"]) {
        assert.deepEqual(await response(after,query+"&view=table"),await response(before,query))
      }
    }
    after.state.scope=null;after.state.user={...after.user};after.resetCounts()
    const full=JSON.parse((await response(after,"?id=ATH00001&view=table")).body)
    assert.ok("email" in full.athletes[0]);assert.equal("currentSeason" in full,false)
    assert.equal(after.state.normalizations,2,"matching duplicate rows only")
    after.resetCounts();await response(after,"?id=ATH00002&view=table")
    assert.equal(after.state.normalizations,1);assert.equal(after.state.categoryCalls,1);assert.equal(after.state.sortCalls,0)
    after.state.currentSeasonId=""
    const table=JSON.parse((await response(after,"?view=table")).body)
    assert.equal(table.currentSeason,null);assert.ok(table.athletes.every((r:any)=>r.licenceDisplay===""&&r.licenceState==="MISSING"))
  } finally {before.close();after.close()}
})

test("table: same 401/403/503, revocation, activation and data source failures; no reads before auth", async () => {
  const before=await createAthleteDetailFixture(false,undefined,true,"tests/fixtures/athletes-before-table.ts"),after=await createAthleteDetailFixture(false)
  try {
    for(const scenario of ["anonymous","no-grant","revoked","disabled","activation","auth-source","ATHLETES","CATEGORIES_AGE","ATHLETE_LICENCES"] as const) {
      for(const f of [before,after]) {
        f.resetCounts();f.state.user={...f.user};f.state.grants=[f.grant];f.state.authUnavailable=false;f.state.failSheet=""
        if(scenario==="anonymous")f.state.user=null
        if(scenario==="no-grant")f.state.grants=[]
        if(scenario==="revoked")f.state.user!.sessionVersion++
        if(scenario==="disabled")f.state.user!.statut="INACTIF"
        if(scenario==="activation"){f.state.user!.doitChangerMotDePasse=true;f.state.user!.dateExpirationAccesTemporaire=new Date((f.state.now+3600)*1000).toISOString()}
        if(scenario==="auth-source")f.state.authUnavailable=true
        if(["ATHLETES","CATEGORIES_AGE","ATHLETE_LICENCES"].includes(scenario))f.state.failSheet=scenario
      }
      const result=await response(after,"?view=table")
      assert.deepEqual(result,await response(before,"?view=table"),scenario)
      assert.equal(result.status,["anonymous","revoked","disabled"].includes(scenario)?401:["no-grant","activation"].includes(scenario)?403:503)
      if(!["ATHLETES","CATEGORIES_AGE","ATHLETE_LICENCES"].includes(scenario))assert.equal(after.state.sheetReads.length,0)
    }
  } finally {before.close();after.close()}
})

test("allowlist: unknown/new fields excluded, optional row key retained, input unchanged",()=>{
  const row={id:"A",nom:"Test",prenom:"Synthetic",sexe:"F",dateNaissance:"",statut:"ACTIF",__key:"ROW",newConfidentialField:"secret"}
  const snapshot={...row},projected=projectAthleteTableRow(row)
  assert.equal(projected.__key,"ROW");assert.equal("newConfidentialField" in projected,false);assert.deepEqual(row,snapshot)
})
