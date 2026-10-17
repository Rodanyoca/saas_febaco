import { createRequire } from "node:module"
import { readFile,writeFile } from "node:fs/promises"
import { createCipheriv,createDecipheriv,randomBytes,randomUUID } from "node:crypto"
import { resolve } from "node:path"
import { readUsersTables,createGoogleUsersSheetsAdapter } from "../lib/users/google-adapter"
import { migrationDecision,prepareMigration } from "../lib/auth/migration"
import { buildScopeIndex } from "../lib/auth/territorial-scope"
import { assertLastActiveSuperAdminProtected } from "../lib/auth/authorization"
import { parseUser,validateUsersHeaders,validateUserAuthorizationHeaders,validateAuthAttemptHeaders,validateAuditLogHeaders } from "../lib/users/validation"
import { isSupportedPasswordHash,hashPassword } from "../lib/auth/password"
import { PasswordPolicyError } from "../lib/auth/password-policy"
import { readSheetRowsBatch } from "../lib/google-sheets"
import { writeAudit } from "../lib/audit/logger"
import { getUsersSpreadsheetId } from "../lib/users/config"

createRequire(process.cwd()+"/package.json")("@next/env").loadEnvConfig(process.cwd())
const args=process.argv.slice(2),command=args[0]||"plan",value=(flag:string)=>args[args.indexOf(flag)+1],has=(flag:string)=>args.includes(flag)
const EXPECTED="1Lunm88A0nKU3LtZ_4GggPTZ4Oh3BAYpSFMP2XgNZHnU"
let stage="preparation"
function backupKey(){const key=process.env.AUTH_MIGRATION_BACKUP_KEY||"";if(!/^[a-f0-9]{64}$/i.test(key))throw new Error("Clé de sauvegarde indépendante requise (64 caractères hexadécimaux).");if(key===process.env.AUTH_SECRET||key===process.env.AUTH_SESSION_SECRET)throw new Error("La clé de sauvegarde doit être indépendante.");return Buffer.from(key,"hex")}
async function backup(data:unknown){
 const name=value("--backup");if(!has("--backup")||!name)throw new Error("Chemin de sauvegarde chiffrée requis.")
 const path=resolve(name);if(/(?:^|[\\/])(?:public|\.git)(?:[\\/]|$)/.test(path))throw new Error("Chemin de sauvegarde refusé.")
 const nonce=randomBytes(12),cipher=createCipheriv("aes-256-gcm",backupKey(),nonce),encrypted=Buffer.concat([cipher.update(JSON.stringify(data)),cipher.final()])
 await writeFile(path,JSON.stringify({version:1,nonce:nonce.toString("base64"),tag:cipher.getAuthTag().toString("base64"),data:encrypted.toString("base64")}),{flag:"wx",mode:0o600})
}
async function secretInput(){
 if(!process.stdin.isTTY){if(!has("--password-stdin"))throw new Error("Entrée protégée requise.");let text="";for await(const chunk of process.stdin){text+=chunk;if(text.length>2048)throw new Error("Entrée trop longue.")}return text.replace(/\r?\n$/,"")}
 // No echo and no command-line secret; operator types it into the terminal.
 process.stdout.write("Nouveau secret temporaire (saisie masquée) : ")
 process.stdin.setRawMode(true);process.stdin.resume();let result=""
 return new Promise<string>((resolveSecret,reject)=>{const input=(chunk:Buffer)=>{for(const ch of chunk.toString()){if(ch==='\u0003'){cleanup();reject(new Error("Annulé."));return}if(ch==='\r'||ch==='\n'){cleanup();resolveSecret(result);return}if(ch==='\u007f'||ch==='\b')result=result.slice(0,-1);else if(ch>=' ')result+=ch;if(result.length>128){cleanup();reject(new Error("Secret trop long."));return}}};const cleanup=()=>{process.stdin.off("data",input);process.stdin.setRawMode(false);process.stdin.pause();process.stdout.write("\n")};process.stdin.on("data",input)})
}
async function main(){
 if(getUsersSpreadsheetId()!==EXPECTED)throw new Error("Classeur cible inattendu ; opération refusée.")
 const tables=await readUsersTables(["USERS","USER_AUTORISATIONS","AUTH_TENTATIVES","JOURNAL_OPERATIONS"])
 validateUsersHeaders(tables.USERS.headers);validateUserAuthorizationHeaders(tables.USER_AUTORISATIONS.headers);validateAuthAttemptHeaders(tables.AUTH_TENTATIVES.headers);validateAuditLogHeaders(tables.JOURNAL_OPERATIONS.headers)
 const ids=new Set<string>(),emails=new Set<string>();for(const row of tables.USERS.rows){const email=row.email.trim().toLowerCase();if(!row.id_user||!email||ids.has(row.id_user)||emails.has(email))throw new Error("Identifiants ou e-mails absents/dupliqués.");ids.add(row.id_user);emails.add(email)}
 const raw=await readSheetRowsBatch({block:"structure",sheets:["LIGUES","ENTENTES"],fresh:true}),structure={ligues:raw.LIGUES,ententes:raw.ENTENTES},adapter=createGoogleUsersSheetsAdapter(tables)
 if(command==="plan"){
  console.log(JSON.stringify({mode:"DRY_RUN_NO_WRITES",users:tables.USERS.rows.map(row=>migrationDecision(row,structure))},null,2));return
 }
 const expectedConfirmation:Record<string,string>={apply:"MIGRER-FEBACO",purge:"PURGER-HISTORIQUE",restore:"RESTAURER-FEBACO",reset:"REINITIALISER-FEBACO",revoke:"REVOQUER-FEBACO",disable:"DESACTIVER-FEBACO"}
 if(!expectedConfirmation[command]||value("--confirm")!==expectedConfirmation[command])throw new Error("Confirmation explicite absente.")
 await backup({spreadsheetId:EXPECTED,tables,createdAt:new Date().toISOString()})
 if(command==="apply"){
  const names=new Map(args.filter(a=>a.startsWith("--name=")).map(a=>{const text=a.slice(7),i=text.indexOf("=");return [text.slice(0,i),text.slice(i+1)]}))
  // Validate every candidate before the first write.
  const candidates=await Promise.all(tables.USERS.rows.map(async row=>{const prepared=await prepareMigration(row,structure,{approveClear:has("--approve-legacy-clear"),name:names.get(row.id_user)});if(!prepared)parseUser(row,2);else parseUser({...row,...prepared.values},2);return {row,prepared}}))
  for(const {row,prepared} of candidates){
   if(!prepared){parseUser(row,2);continue}
   for(const grant of prepared.grants){const current=(await readUsersTables(["USER_AUTORISATIONS"])).USER_AUTORISATIONS.rows;if(!current.some(g=>g.id_user_autorisation===grant.id_user_autorisation||(g.id_user===grant.id_user&&g.id_bloc_autorisation===grant.id_bloc_autorisation)))await adapter.appendRow("USER_AUTORISATIONS",grant)}
   // User becomes usable only after all explicit grants exist. Retry preserves already-migrated accounts.
   await adapter.updateRow!("USERS","id_user",row.id_user,prepared.values)
   const confirmed=(await readUsersTables(["USERS"])).USERS.rows.find(r=>r.id_user===row.id_user)!
   parseUser(confirmed,2)
   if(Object.entries(prepared.values).some(([k,v])=>confirmed[k]!==v)||confirmed.id_ligue!==row.id_ligue||confirmed.id_entente!==row.id_entente)throw new Error("Migration non confirmée.")
   await writeAudit({adapter,action:"MIGRATION_AUTH",typeObjet:"USER",objectId:row.id_user,result:"SUCCES",requestId:randomUUID(),details:{motif:prepared.decision.reason}})
  }
 }else if(command==="restore"){
  if(!has("--from"))throw new Error("Sauvegarde source requise.")
  const encrypted=JSON.parse(await readFile(resolve(value("--from")),"utf8")),decipher=createDecipheriv("aes-256-gcm",backupKey(),Buffer.from(encrypted.nonce,"base64"));decipher.setAuthTag(Buffer.from(encrypted.tag,"base64"))
  const saved=JSON.parse(Buffer.concat([decipher.update(Buffer.from(encrypted.data,"base64")),decipher.final()]).toString("utf8"))
  if(saved.spreadsheetId!==EXPECTED)throw new Error("Sauvegarde étrangère.")
  const restoredIds=new Set(saved.tables.USERS.rows.map((r:Record<string,string>)=>r.id_user))
  for(const row of saved.tables.USERS.rows)await adapter.updateRow!("USERS","id_user",row.id_user,row)
  const before=new Set(saved.tables.USER_AUTORISATIONS.rows.map((r:Record<string,string>)=>r.id_user_autorisation))
  for(const row of tables.USER_AUTORISATIONS.rows)if(restoredIds.has(row.id_user)&&row.id_user_autorisation.startsWith("MIG-")&&!before.has(row.id_user_autorisation))await adapter.updateRow!("USER_AUTORISATIONS","id_user_autorisation",row.id_user_autorisation,{statut:"INACTIF"})
 }else{
  if(!has("--id"))throw new Error("Identifiant utilisateur requis.")
  const row=tables.USERS.rows.find(r=>r.id_user===value("--id"));if(!row)throw new Error("Utilisateur introuvable.")
  const checkedHash=command==="reset"?`scrypt$v1$N=65536,r=8,p=1,l=64$${Buffer.alloc(16).toString("base64url")}$${Buffer.alloc(64).toString("base64url")}`:row.password_hash
  const user=parseUser({...row,password_hash:checkedHash},2)
  if(command==="disable")assertLastActiveSuperAdminProtected({target:user,users:tables.USERS.rows.map((r,i)=>parseUser(r,i+2)),willRemainActiveSuperAdmin:false})
  if(command==="purge"){
   if(!has("--validated")||user.doitChangerMotDePasse||!user.derniereConnexion||!isSupportedPasswordHash(user.passwordHash))throw new Error("Activation et validation opérateur requises avant purge.")
   await adapter.updateRow!("USERS","id_user",row.id_user,{password:""})
  }else if(command==="reset"){
   if(user.idLigue||user.idEntente)buildScopeIndex(user,{LIGUES:structure.ligues,ENTENTES:structure.ententes})
   stage="saisie_et_validation_du_mot_de_passe"
   const passwordHash=await hashPassword(await secretInput())
   stage="ecriture_du_compte"
   await adapter.updateRow!("USERS","id_user",row.id_user,{password_hash:passwordHash,doit_changer_mot_de_passe:"TRUE",date_expiration_acces_temporaire:new Date(Date.now()+24*60*60*1000).toISOString(),session_version:String(user.sessionVersion+1),...(has("--enable")?{statut:"ACTIF"}:{}),date_modification_mot_de_passe:new Date().toISOString()})
  }else await adapter.updateRow!("USERS","id_user",row.id_user,{session_version:String(user.sessionVersion+1),...(command==="disable"?{statut:"INACTIF"}:{})})
 }
 stage="journalisation"
 await writeAudit({adapter,action:"AUTH_"+command.toUpperCase(),typeObjet:"USER",result:"SUCCES",requestId:randomUUID()})
 console.log("Opération terminée ; aucun secret affiché.")
}
main().catch((error)=>{if(error instanceof PasswordPolicyError)console.error(error.message);else console.error(`Opération refusée ou non confirmée (étape : ${stage}). Aucun détail sensible journalisé. Vérifiez l'état du compte avant de réessayer.`);process.exitCode=1})
