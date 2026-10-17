import test from "node:test"
import assert from "node:assert/strict"
import { build } from "esbuild"
import { createRequire } from "node:module"
import { resolve } from "node:path"
import { readFile,readdir } from "node:fs/promises"
import { createSessionToken } from "../../lib/auth/session-token"
import { buildScopeIndex } from "../../lib/auth/territorial-scope"
import type { User } from "../../lib/users/types"

test("real API guard: auth, grants, territorial rows, revoked token, CSRF, journals and source failure",async()=>{
 const secret="synthetic-fixture-signing-key-not-a-real-secret",now=1800000000
 const user:User={idUser:"U",nomComplet:"Synthetic",email:"u@example.invalid",passwordHash:"unused",typeUser:"ADMIN",estSuperAdmin:false,doitChangerMotDePasse:false,statut:"ACTIF",dateCreation:"2026-01-01T00:00:00Z",dateModificationMotDePasse:null,derniereConnexion:null,sessionVersion:1,dateExpirationAccesTemporaire:null}
 const token=await createSessionToken({idUser:"U",sessionVersion:1,secret,nowSeconds:now})
 const state={user:user as User|null,token,secret,now,unavailable:false,journalFail:false,scope:null as ReturnType<typeof buildScopeIndex>|null,grants:[{idUserAutorisation:"G",idUser:"U",idBlocAutorisation:"AUT-SPT",statut:"ACTIF",dateDebut:"2000-01-01",dateFin:null}],audit:[] as unknown[]}
 const virtual:Record<string,string>={
  "../auth-session":`import {resolveSession} from ${JSON.stringify(resolve("lib/auth/session-resolution.ts"))}; export async function getResolvedSession(){const s=globalThis.__febacoGuardFixture;const result=await resolveSession({token:s.token,secret:s.secret,nowSeconds:s.now,loadUser:async()=>{if(s.unavailable)throw Error('offline');return s.user}});if(!result.ok&&result.reason==='SOURCE_UNAVAILABLE')throw Error('source');return result.ok?result:null}`,
  "../users/data":"export async function getAuthorizationsForUser(){return globalThis.__febacoGuardFixture.grants}",
  "../users/google-adapter":"export function createGoogleUsersSheetsAdapter(){return {}}",
  "./scope-source":"export async function loadScopeIndex(){return globalThis.__febacoGuardFixture.scope}",
  "../audit/logger":"export async function writeAudit(input){const s=globalThis.__febacoGuardFixture;if(s.journalFail)throw Error('journal');s.audit.push(input)}",
 }
 const compiled=await build({stdin:{contents:'export {protectedRoute} from "./lib/auth/guard";export {scopeReadRows} from "./lib/auth/data-context";',resolveDir:process.cwd(),loader:"ts"},bundle:true,write:false,platform:"node",format:"cjs",packages:"external",plugins:[{name:"isolated-auth-source",setup(b){b.onResolve({filter:/.*/},a=>a.path in virtual?{path:a.path,namespace:"fixture"}:undefined);b.onLoad({filter:/.*/,namespace:"fixture"},a=>({contents:virtual[a.path],loader:"js",resolveDir:process.cwd()}))}}]})
 const globals=globalThis as typeof globalThis & {__febacoGuardFixture?:typeof state};globals.__febacoGuardFixture=state
 try{
  const module={exports:{} as {protectedRoute:(fn:()=>Response)=>(r:Request)=>Promise<Response>;scopeReadRows:(sheet:string,rows:Record<string,string>[])=>Record<string,string>[]}}
  new Function("require","module","exports",compiled.outputFiles[0].text)(createRequire(resolve("package.json")),module,module.exports)
  const {protectedRoute,scopeReadRows}=module.exports
  let executed=0
  const handler=protectedRoute(()=>{executed++;return Response.json({clubs:scopeReadRows("CLUBS",[{id_club:"C1"},{id_club:"C2"}])})})
  const request=(method="GET",origin="https://febaco.invalid")=>new Request("https://febaco.invalid/api/clubs",{method,headers:{origin}})
  assert.equal((await handler(request())).status,200)
  state.grants=[];assert.equal((await handler(request())).status,403)
  state.grants=[{idUserAutorisation:"G",idUser:"U",idBlocAutorisation:"AUT-SPT",statut:"ACTIF",dateDebut:"2000-01-01",dateFin:null}]
  state.user={...user,typeUser:"VIEWER",idLigue:"L1"};state.scope=buildScopeIndex(state.user,{LIGUES:[{id_ligue:"L1"}],ENTENTES:[{id_entente:"E1",id_ligue:"L1"}],CLUBS:[{id_club:"C1",id_entente:"E1"}],EQUIPES:[]})
  assert.deepEqual((await (await handler(request())).json()).clubs,[{id_club:"C1"}])
  const before=executed;assert.equal((await handler(request("POST"))).status,403);assert.equal(executed,before)
  state.user={...user};state.scope=null
  assert.equal((await handler(request("POST","https://other.invalid"))).status,403)
  assert.equal((await handler(request("POST"))).status,200);assert.ok(state.audit.length>=2)
  state.journalFail=true;const beforeJournal=executed;assert.equal((await handler(request("POST"))).status,503);assert.equal(executed,beforeJournal)
  state.journalFail=false;state.user={...user,sessionVersion:2};assert.equal((await handler(request())).status,401)
  state.user={...user,statut:"INACTIF"};assert.equal((await handler(request())).status,401)
  state.unavailable=true;assert.equal((await handler(request())).status,503)
 }finally{delete globals.__febacoGuardFixture}
})
test("all business HTTP exports are covered by the central guard",async()=>{
 async function walk(dir:string):Promise<string[]>{const entries=await readdir(dir,{withFileTypes:true});return(await Promise.all(entries.map(e=>e.isDirectory()?walk(dir+"/"+e.name):Promise.resolve([dir+"/"+e.name])))).flat()}
 const files=(await walk("app/api")).filter(p=>p.endsWith("/route.ts")&&!p.startsWith("app/api/auth/"))
 for(const file of files){const source=await readFile(file,"utf8");assert.doesNotMatch(source,/export async function (?:GET|POST|PUT|PATCH|DELETE)\(/,file);for(const match of source.matchAll(/export const (GET|POST|PUT|PATCH|DELETE)\s*=/g))assert.match(source,new RegExp(`export const ${match[1]} = protectedRoute\\(`),file)}
 assert.ok(files.length>60)
})
