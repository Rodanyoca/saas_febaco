import test from "node:test"
import assert from "node:assert/strict"
import { createSessionToken,verifySessionToken,SESSION_TTL_SECONDS } from "../../lib/auth/session-token"
import { resolveSession } from "../../lib/auth/session-resolution"
import { authorize,assertLastActiveSuperAdminProtected } from "../../lib/auth/authorization"
import { DirectoryCache,type Directory } from "../../lib/auth/directory-cache"
import { buildScopeIndex,filterTerritorialRows } from "../../lib/auth/territorial-scope"
import { classifyHistoricalPassword,legacyProfile,prepareMigration } from "../../lib/auth/migration"
import { hashPassword,verifyPassword,isSupportedPasswordHash } from "../../lib/auth/password"
import { mapUsersTable,userCellUpdates } from "../../lib/users/sheet-table"
import { attemptState } from "../../lib/auth/attempts"
import { sanitizeAuditDetails } from "../../lib/audit/logger"
import { routePolicy } from "../../lib/auth/route-policy"
import { resolveTerritorialId } from "../../lib/auth/territorial-id"
import { isMutationOriginAllowed } from "../../lib/auth/request-origin"
import { readAuthJson } from "../../lib/auth/request-body"
import { withDataScope,scopeReadRows } from "../../lib/auth/data-context"
import { USER_HEADERS,type User,type UserAuthorization } from "../../lib/users/types"

const secret="synthetic-signing-key-for-tests-only-1234567890",now=1_800_000_000
const hash=`scrypt$v1$N=65536,r=8,p=1,l=64$${Buffer.alloc(16).toString("base64url")}$${Buffer.alloc(64).toString("base64url")}`
const user:User={idUser:"U1",nomComplet:"Compte test",email:"test@example.invalid",passwordHash:hash,typeUser:"ADMIN",estSuperAdmin:false,doitChangerMotDePasse:false,statut:"ACTIF",dateCreation:"2026-01-01T00:00:00Z",dateModificationMotDePasse:null,derniereConnexion:null,sessionVersion:1,dateExpirationAccesTemporaire:null,idLigue:"",idEntente:""}
const grant:UserAuthorization={idUserAutorisation:"G1",idUser:"U1",idBlocAutorisation:"AUT-SPT",statut:"ACTIF",dateDebut:"2026-01-01",dateFin:null}

test("signed sessions contain only identifiers/version and expire; legacy cookies rejected",async()=>{
 const token=await createSessionToken({idUser:user.idUser,sessionVersion:1,secret,nowSeconds:now})
 const payload=await verifySessionToken({token,secret,nowSeconds:now})
 assert.deepEqual(Object.keys(payload!).sort(),["exp","iat","id_user","session_version"])
 assert.equal(await verifySessionToken({token,secret,nowSeconds:now+SESSION_TTL_SECONDS}),null)
 assert.equal(await verifySessionToken({token:token+"x",secret,nowSeconds:now}),null)
 assert.equal(await verifySessionToken({token:"old.role-cookie",secret,nowSeconds:now}),null)
})
test("disabled, deleted, revoked and temporary-expired users cannot use signed sessions",async()=>{
 const token=await createSessionToken({idUser:"U1",sessionVersion:1,secret,nowSeconds:now})
 for(const changed of [null,{...user,statut:"INACTIF" as const},{...user,sessionVersion:2},{...user,doitChangerMotDePasse:true,dateExpirationAccesTemporaire:null},{...user,dateExpirationAccesTemporaire:new Date(now*1000-1).toISOString()}]){
  assert.equal((await resolveSession({token,secret,nowSeconds:now,loadUser:async()=>changed})).ok,false)
 }
 const unavailable=await resolveSession({token,secret,nowSeconds:now,loadUser:async()=>{throw new Error("offline")}})
 assert.deepEqual(unavailable,{ok:false,reason:"SOURCE_UNAVAILABLE"})
 const pending=await resolveSession({token,secret,nowSeconds:now,loadUser:async()=>({...user,doitChangerMotDePasse:true,dateExpirationAccesTemporaire:new Date(now*1000+1000).toISOString()})})
 assert.equal(pending.ok&&pending.requiresActivation,true)
})
test("federal is not superadmin; explicit grants, VIEWER and grant dates enforced",()=>{
 const requirement={scope:"BUSINESS" as const,blocks:["AUT-SPT" as const]}
 assert.equal(authorize({user,authorizations:[],requirement,action:"READ",date:"2026-10-16"}).allowed,false)
 assert.equal(authorize({user,authorizations:[grant],requirement,action:"WRITE",date:"2026-10-16"}).allowed,true)
 assert.equal(authorize({user:{...user,typeUser:"VIEWER"},authorizations:[grant],requirement,action:"WRITE",date:"2026-10-16"}).allowed,false)
 assert.equal(authorize({user,authorizations:[grant],requirement:{scope:"SUPER_ADMIN"},action:"READ"}).allowed,false)
 for(const change of [{statut:"INACTIF" as const},{dateFin:"2026-01-02"},{dateDebut:"2027-01-01"}])assert.equal(authorize({user,authorizations:[{...grant,...change}],requirement,action:"READ",date:"2026-10-16"}).allowed,false)
})
test("directory caches indexes once; two instances see revocation within TTL; no stale fallback",async()=>{
 let clock=0,calls=0,active=true,fail=false
 const load=async():Promise<Directory>=>{calls++;if(fail)throw new Error("unavailable");const u={...user,statut:active?"ACTIF" as const:"INACTIF" as const};return{byId:new Map([[u.idUser,u]]),byEmail:new Map([[u.email,u]]),grants:new Map()}}
 const a=new DirectoryCache(load,10000,()=>clock),b=new DirectoryCache(load,10000,()=>clock)
 await Promise.all([a.get(),a.get(),a.get()]);assert.equal(calls,1)
 await b.get();active=false;a.invalidate();assert.equal((await a.get()).byId.get("U1")!.statut,"INACTIF")
 assert.equal((await b.get()).byId.get("U1")!.statut,"ACTIF")
 clock=10000;assert.equal((await b.get()).byId.get("U1")!.statut,"INACTIF")
 clock=20000;fail=true;await assert.rejects(b.get())
})
const structure={ligues:[{id_ligue:"L1"},{id_ligue:"L2"}],ententes:[{id_entente:"E1",id_ligue:"L1"},{id_entente:"E2",id_ligue:"L1"},{id_entente:"E3",id_ligue:"L2"}]}
const rows={ENTENTES:structure.ententes,CLUBS:[{id_club:"C1",id_entente:"E1"},{id_club:"C2",id_entente:"E2"},{id_club:"C3",id_entente:"E3"}],EQUIPES:[{id_equipe:"T1",id_club:"C1"},{id_equipe:"T2",id_club:"C2"},{id_equipe:"T3",id_club:"C3"}],ATHLETE_AFFILIATIONS:[{id_athlete:"A1",id_equipe:"T1"},{id_athlete:"A2",id_equipe:"T2"},{id_athlete:"A3",id_equipe:"T3"}]}
test("league and entente scopes exclude sibling and foreign structures/actors/licences",()=>{
 const league=buildScopeIndex({idLigue:"L1"},rows),entente=buildScopeIndex({idLigue:"L1",idEntente:"E1"},rows)
 assert.deepEqual(filterTerritorialRows("CLUBS",rows.CLUBS,league).map(r=>r.id_club),["C1","C2"])
 assert.deepEqual(filterTerritorialRows("CLUBS",rows.CLUBS,entente).map(r=>r.id_club),["C1"])
 assert.deepEqual(filterTerritorialRows("ATHLETES",[{id_athlete:"A1"},{id_athlete:"A2"}],entente),[{id_athlete:"A1"}])
 assert.deepEqual(filterTerritorialRows("ATHLETE_LICENCES",[{id_athlete:"A3"}],league),[])
 assert.throws(()=>buildScopeIndex({idLigue:"L2",idEntente:"E1"},rows))
 assert.deepEqual(filterTerritorialRows("ARBITRES",[{id_arbitre:"R1"}],league),[])
})
test("leading zero aliases are unique and do not rewrite historic assignments",()=>{
 const rows=[{id_ligue:"01"},{id_ligue:"02"}]
 assert.equal(resolveTerritorialId("1",rows,"id_ligue"),"01")
 assert.equal(resolveTerritorialId("1",[{id_ligue:"01"},{id_ligue:"001"}],"id_ligue"),null)
 assert.equal(resolveTerritorialId("unknown",rows,"id_ligue"),null)
 assert.equal(legacyProfile({role:"entente",id_ligue:"1",id_entente:"101"},{ligues:rows,ententes:[{id_entente:"0101",id_ligue:"01"}]}).valid,true)
})
test("migration preserves scope, never infers superadmin, and refuses ambiguous mappings",async()=>{
 for(const [role,id_ligue,id_entente,type] of [["federal","","","ADMIN"],["ligue","L1","","VIEWER"],["entente","L1","E1","VIEWER"]]){
  const row={id_user:"U1",nom_complet:"Test",email:"test@example.invalid",role,id_ligue,id_entente,password:"an explicit sufficiently long phrase",statut:"actif"}
  const result=await prepareMigration(row,structure,{approveClear:true})
  assert.equal(result!.values.type_user,type);assert.equal(result!.values.est_super_admin,"FALSE")
  assert.equal("id_ligue" in result!.values,false);assert.equal("id_entente" in result!.values,false)
  assert.equal(await prepareMigration({...row,...result!.values},structure,{approveClear:true}),null)
 }
 assert.equal(legacyProfile({role:"unknown",id_ligue:"L1"},structure).valid,false)
 assert.deepEqual(legacyProfile({role:"entente",id_ligue:"L2",id_entente:"E1"},structure).blocks,[])
})
test("password formats are verified; ambiguous hashes and weak historical passwords need reset",async()=>{
 assert.equal(isSupportedPasswordHash(hash),true)
 for(const value of ["password","a".repeat(64),"scrypt$v1$bad", "$2b$12$invalid"]){assert.equal(isSupportedPasswordHash(value),false);assert.equal(classifyHistoricalPassword(value),"RESET_REQUIRED")}
 const encoded=await hashPassword("A long synthetic phrase 123!")
 assert.equal(await verifyPassword("A long synthetic phrase 123!",encoded),true)
 assert.equal(await verifyPassword("wrong",encoded),false)
})
test("headers reordered and blank physical rows cannot change user mappings or update targets",()=>{
 const headers=[...USER_HEADERS].reverse(),values=[headers,[],headers.map(h=>h==="id_user"?"U1":h==="password"?"legacy":h==="email"?"u@example.invalid":"")]
 assert.equal(mapUsersTable(values).rows[0].id_user,"U1")
 const updates=userCellUpdates("USERS",values,"id_user","U1",{password_hash:hash})
 assert.match(updates[0].range,/3$/);assert.notEqual(updates[0].range,"'USERS'!D3")
 assert.throws(()=>mapUsersTable([["id_user","id_user"]]))
})
test("attempt lockout uses persistent observations and telemetry details reject secrets",()=>{
 const timestamp=new Date(),attempts=Array.from({length:10},(_,i)=>({idTentative:String(i),identifiantHash:"pseudo",ipHash:"other-ip",dateTentative:new Date(timestamp.getTime()-i*100).toISOString(),resultat:"ECHEC" as const,requestId:String(i)}))
 assert.equal(attemptState(attempts,"pseudo","different-ip",timestamp).blocked,true)
 assert.deepEqual(sanitizeAuditDetails({password:"abc",token:"abc",hash:"abc",details:{secret:"abc"},motif:"REFUS_GENERIQUE"}),{motif:"REFUS_GENERIQUE"})
 assert.equal(isMutationOriginAllowed(new Request("https://example.invalid/api/clubs",{method:"POST",headers:{origin:"https://evil.invalid"}})),false)
 assert.equal(routePolicy("/api/unknown"),null)
})
test("authentication JSON is bounded and cannot rely on a forged content length",async()=>{
 const request=new Request("https://example.invalid/login",{method:"POST",body:JSON.stringify({value:"x".repeat(9000)}),headers:{"content-length":"1"}})
 await assert.rejects(readAuthJson(request))
 assert.deepEqual(await readAuthJson(new Request("https://example.invalid/login",{method:"POST",body:'{"value":1}'})),{value:1})
})
test("dashboard reads cannot reveal an unassigned administration block",()=>{
 assert.deepEqual(withDataScope(null,()=>scopeReadRows("DOCUMENTS",[{id_document:"private"}]),{allowAdmin:false}),[])
 assert.deepEqual(withDataScope(null,()=>scopeReadRows("ACTIVITES_PARTICIPANTS",[{id_acteur:"private"}]),{allowAdmin:false}),[])
})
test("administrative records without a matching territorial relation are excluded",()=>{
 const scope=buildScopeIndex({idLigue:"L1",idEntente:"E1"},{...rows,ACTIVITES:[{id_activite:"ACT1",id_entite_organisatrice:"C1"},{id_activite:"ACT2",id_entite_organisatrice:"C3"}],DOCUMENTS_RELATIONS:[{id_document:"D1",id_type_entite:"CLUB",id_entite:"C1"},{id_document:"D2",id_type_entite:"CLUB",id_entite:"C3"}]})
 assert.deepEqual(filterTerritorialRows("ACTIVITES",[{id_activite:"ACT1"},{id_activite:"ACT2"}],scope),[{id_activite:"ACT1"}])
 assert.deepEqual(filterTerritorialRows("DOCUMENTS_FICHIERS",[{id_document:"D1"},{id_document:"D2"}],scope),[{id_document:"D1"}])
})
test("the last active explicitly designated superadministrator cannot be disabled",()=>{
 const target={...user,estSuperAdmin:true}
 assert.throws(()=>assertLastActiveSuperAdminProtected({target,users:[target],willRemainActiveSuperAdmin:false}))
 assert.doesNotThrow(()=>assertLastActiveSuperAdminProtected({target,users:[target,{...target,idUser:"other"}],willRemainActiveSuperAdmin:false}))
})
