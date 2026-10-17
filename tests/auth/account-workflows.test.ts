import test from "node:test"
import assert from "node:assert/strict"
import { activateAccount,changeOwnPassword } from "../../lib/auth/account-workflows"
import { hashPassword,verifyPassword } from "../../lib/auth/password"
import { userToSheetRow } from "../../lib/users/commands"
import { USER_HEADERS,AUDIT_LOG_HEADERS,AUTH_ATTEMPT_HEADERS,USER_AUTHORIZATION_HEADERS,type User,type UsersSheetsAdapter } from "../../lib/users/types"
import { parseUser } from "../../lib/users/validation"

test("activation/password rotation revoke previous sessions and preserve stored identifiers",async()=>{
 const temporary="A synthetic temporary phrase 123!",next="A synthetic personal phrase 456!",now=new Date()
 const user:User={idUser:"U1",nomComplet:"Test",email:"u@example.invalid",passwordHash:await hashPassword(temporary),typeUser:"VIEWER",estSuperAdmin:false,doitChangerMotDePasse:true,statut:"ACTIF",dateCreation:now.toISOString(),dateModificationMotDePasse:null,derniereConnexion:null,sessionVersion:1,dateExpirationAccesTemporaire:new Date(now.getTime()+86400000).toISOString(),idLigue:"1",idEntente:"101"}
 const rows:Record<string,Record<string,string>[]>= {USERS:[{...userToSheetRow(user),password:"historical-kept",role:"entente"}],JOURNAL_OPERATIONS:[],AUTH_TENTATIVES:[],USER_AUTORISATIONS:[]}
 const headers:Record<string,readonly string[]>={USERS:USER_HEADERS,JOURNAL_OPERATIONS:AUDIT_LOG_HEADERS,AUTH_TENTATIVES:AUTH_ATTEMPT_HEADERS,USER_AUTORISATIONS:USER_AUTHORIZATION_HEADERS}
 let journalFailure=false
 const adapter:UsersSheetsAdapter={readHeaders:async name=>[...headers[name]],readRows:async name=>rows[name].map(row=>({...row})),appendRow:async(name,row)=>{if(journalFailure)throw new Error("journal offline");rows[name].push({...row})},updateRow:async(name,key,id,update)=>{Object.assign(rows[name].find(row=>row[key]===id)!,update)}}
 const active=await activateAccount({adapter,user,temporaryAccess:temporary,newPassword:next,now})
 assert.equal(active.sessionVersion,2);assert.equal(active.doitChangerMotDePasse,false);assert.equal(active.dateExpirationAccesTemporaire,null)
 assert.equal(active.idLigue,"1");assert.equal(active.idEntente,"101");assert.equal(rows.USERS[0].password,"historical-kept")
 assert.equal(await verifyPassword(next,active.passwordHash),true)
 assert.equal(rows.JOURNAL_OPERATIONS.length,1)
 await assert.rejects(activateAccount({adapter,user:active,temporaryAccess:temporary,newPassword:next,now}))
 journalFailure=true
 await assert.rejects(changeOwnPassword({adapter,user:active,currentPassword:next,newPassword:"Another synthetic personal phrase 789!"}))
 const changed=parseUser(rows.USERS[0],2)
 assert.equal(changed.sessionVersion,3,"journal failure must not resurrect an old session version")
 assert.equal(await verifyPassword(next,changed.passwordHash),false)
})
