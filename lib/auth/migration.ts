import { randomBytes } from "node:crypto"
import { hashPassword, isSupportedPasswordHash } from "./password"
import { assertPasswordPolicy } from "./password-policy"
import type { SheetRow } from "../users/types"
import { resolveTerritorialId } from "./territorial-id"
const clean=(v:unknown)=>String(v??"").trim()
export function classifyHistoricalPassword(value:string){
  if(isSupportedPasswordHash(value))return "SUPPORTED_SCRYPT" as const
  if(!value||/^(?:scrypt\$|\$|bcrypt|argon2)|^[a-f0-9]{32,128}$/i.test(value))return "RESET_REQUIRED" as const
  try{assertPasswordPolicy(value);return "LEGACY_CLEAR_REQUIRES_APPROVAL" as const}catch{return "RESET_REQUIRED" as const}
}
export function legacyProfile(row:SheetRow,structure:{ligues:SheetRow[];ententes:SheetRow[]}){
  const role=clean(row.role).toLowerCase(),rawLigue=clean(row.id_ligue),rawEntente=clean(row.id_entente)
  const ligue=resolveTerritorialId(rawLigue,structure.ligues,"id_ligue")||"",entente=resolveTerritorialId(rawEntente,structure.ententes,"id_entente")||""
  const leagueExists=structure.ligues.some(r=>clean(r.id_ligue)===ligue)
  const parent=structure.ententes.find(r=>clean(r.id_entente)===entente)
  const valid=role==="federal"?!rawLigue&&!rawEntente:role==="ligue"?Boolean(ligue&&!rawEntente&&leagueExists):role==="entente"?Boolean(parent&&(!rawLigue||(ligue&&clean(parent.id_ligue)===ligue))):false
  return {valid,typeUser:valid&&role==="federal"?"ADMIN" as const:"VIEWER" as const,blocks:valid?["AUT-SPT","AUT-ADM"]:[],reason:valid?"MAPPED_WITHOUT_SUPERADMIN":"AMBIGUOUS_SCOPE_NO_GRANTS"}
}
export function migrationDecision(row:SheetRow,structure:{ligues:SheetRow[];ententes:SheetRow[]}){
  const alreadyMigrated=Boolean(row.type_user||row.password_hash||row.session_version),profile=legacyProfile(row,structure)
  return {id:row.id_user,alreadyMigrated,nameRequired:!clean(row.nom_complet),passwordFormat:alreadyMigrated?(isSupportedPasswordHash(row.password_hash||"")?"CURRENT_SCRYPT" as const:"CURRENT_HASH_REQUIRES_RESET" as const):classifyHistoricalPassword(clean(row.password)),...profile,blocks:alreadyMigrated?[]:profile.blocks}

}
export async function prepareMigration(row:SheetRow,structure:{ligues:SheetRow[];ententes:SheetRow[]},options:{approveClear:boolean;name?:string;now?:Date}){
  const decision=migrationDecision(row,structure)
  if(decision.alreadyMigrated)return null
  const now=options.now||new Date(),name=clean(options.name||row.nom_complet)
  if(!name)throw new Error("Nom complet requis pour "+row.id_user)
  const legacy=clean(row.password),convert=decision.passwordFormat==="SUPPORTED_SCRYPT"||(decision.passwordFormat==="LEGACY_CLEAR_REQUIRES_APPROVAL"&&options.approveClear)
  // Discarded random secret: locked account until an operator supplies a reset; no default password.
  const passwordHash=decision.passwordFormat==="SUPPORTED_SCRYPT"?legacy:await hashPassword(convert?legacy:randomBytes(32).toString("base64url"))
  const oldStatus=clean(row.statut).toUpperCase(),active=oldStatus==="ACTIF"&&decision.valid&&convert
  const values:SheetRow={nom_complet:name,email:clean(row.email).toLowerCase(),password_hash:passwordHash,type_user:decision.typeUser,est_super_admin:"FALSE",doit_changer_mot_de_passe:"TRUE",statut:active?"ACTIF":oldStatus==="INACTIF"?"INACTIF":"BLOQUE",date_creation:row.date_creation||now.toISOString(),date_modification_mot_de_passe:now.toISOString(),derniere_connexion:"",session_version:"1",date_expiration_acces_temporaire:active?new Date(now.getTime()+24*60*60*1000).toISOString():""}
  return {decision,values,grants:decision.blocks.map(block=>({id_user_autorisation:`MIG-${row.id_user}-${block}`,id_user:row.id_user,id_bloc_autorisation:block,statut:"ACTIF",date_debut:now.toISOString().slice(0,10),date_fin:""}))}
}
