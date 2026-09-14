import { pickFirst, readSheetRows, writeSheetRowByHeaders, type SheetRow } from "@/lib/google-sheets"

export type ActorKind = "athletes" | "coachs" | "officiels" | "arbitres" | "medecins" | "autres"
export type ActorFieldErrors = Record<string, string>

export class ActorError extends Error {
  constructor(public code: string, message: string, public status = 400, public fields?: ActorFieldErrors) { super(message) }
}

const commonFields = ["id_national","id_international","nom_complet","id_sexe","date_de_naissance","lieu_de_naissance","nationalite","telephone","email","adresse","numero_passeport","date_de_delivrance_passeport","date_expiration_passeport","statut","avatar_drive_id","avatar_drive_url","passeport_drive_id","passeport_drive_url","observations"] as const

export const actorConfig = {
  athletes: { sheet:"ATHLETES", id:"id_athlete", prefix:"ATH", extra:[] },
  coachs: { sheet:"COACHS", id:"id_coach", prefix:"COA", extra:[] },
  officiels: { sheet:"OFFICIELS", id:"id_officiel", prefix:"OFF", extra:[] },
  arbitres: { sheet:"ARBITRES", id:"id_arbitre", prefix:"ARB", extra:[] },
  medecins: { sheet:"MEDECINS", id:"id_medecin", prefix:"MED", extra:["id_specialite_sante"] },
  autres: { sheet:"AUTRES", id:"id_autre_acteur", prefix:"AUT", extra:["id_type_autre_acteur"] },
} as const

const physicalAliases: Record<string,string[]> = {
  id_international:["id_international","id_fiba","id_fifa","id_bwf"],
  date_de_naissance:["date_de_naissance","date_naissance"],
  lieu_de_naissance:["lieu_de_naissance","lieu_naissance"],
  id_specialite_sante:["id_specialite_sante","id_specialite"],
  id_type_autre_acteur:["id_type_autre_acteur","type_autre_acteur"],
  observations:["observations","observation"],
}
const physicalHeaders:Record<ActorKind,string[]>={
  athletes:["id_athlete","id_national","id_fiba","nom_complet","id_sexe","date_naissance","lieu_naissance","nationalite","telephone","email","adresse","numero_passeport","date_delivrance_passeport","date_expiration_passeport","statut","avatar_drive_id","avatar_drive_url","passeport_drive_id","passeport_drive_url"],
  coachs:["id_coach","id_national","id_fiba","nom_complet","id_sexe","date_naissance","lieu_naissance","nationalite","telephone","email","adresse","numero_passeport","date_delivrance_passeport","date_expiration_passeport","statut","avatar_drive_id","avatar_drive_url","passeport_drive_id","passeport_drive_url"],
  officiels:["id_officiel","id_national","id_fiba","nom_complet","id_sexe","date_naissance","lieu_naissance","nationalite","telephone","email","adresse","numero_passeport","date_delivrance_passeport","date_expiration_passeport","statut","avatar_drive_id","avatar_drive_url","passeport_drive_id","passeport_drive_url"],
  arbitres:["id_arbitre","id_national","id_fifa","nom_complet","id_sexe","date_naissance","lieu_naissance","nationalite","telephone","email","adresse","numero_passeport","date_delivrance_passeport","date_expiration_passeport","statut","avatar_drive_id","avatar_drive_url","passeport_drive_id","passeport_drive_url"],
  medecins:["id_medecin","id_national","id_bwf","nom_complet","id_sexe","date_naissance","lieu_naissance","nationalite","id_specialite","telephone","email","adresse","numero_passeport","date_delivrance_passeport","date_expiration_passeport","statut","avatar_drive_id","avatar_drive_url","passeport_drive_id","passeport_drive_url"],
  autres:["id_autre_acteur","nom_complet","id_sexe","date_naissance","nationalite","telephone","email","type_autre_acteur","statut"],
}
const clean=(v:unknown)=>String(v??"").trim()
const fieldsFor=(kind:ActorKind)=>[...commonFields,...actorConfig[kind].extra]

export function normalizeSexId(value: unknown): string {
  const v=clean(value).normalize("NFD").replace(/\p{Diacritic}/gu,"").toUpperCase()
  if(["SEX001","M","MASCULIN","MASCULINE"].includes(v)) return "SEX001"
  if(["SEX002","F","FEMININ","FEMININE"].includes(v)) return "SEX002"
  if(["SEX099","AUTRE"].includes(v)) return "SEX099"
  return v
}

export function validateActorInput(kind:ActorKind, body:unknown, today=new Date().toISOString().slice(0,10)) {
  const source=body&&typeof body==="object"?body as Record<string,unknown>:{}
  const values=Object.fromEntries(fieldsFor(kind).map(field=>[field,clean(source[field])]))
  const errors:ActorFieldErrors={}
  values.id_sexe=normalizeSexId(values.id_sexe)
  for(const field of ["nom_complet","id_sexe","statut"]) if(!values[field]) errors[field]="Ce champ est obligatoire."
  if(values.id_sexe&&!['SEX001','SEX002','SEX099'].includes(values.id_sexe)) errors.id_sexe="Sexe invalide."
  if(values.statut&&!['ACTIF','INACTIF'].includes(values.statut)) errors.statut="Statut invalide."
  if(values.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email="Adresse e-mail invalide."
  if(values.date_de_naissance&&values.date_de_naissance>today) errors.date_de_naissance="La date de naissance ne peut pas être future."
  if(values.date_de_delivrance_passeport&&values.date_expiration_passeport&&values.date_expiration_passeport<values.date_de_delivrance_passeport) errors.date_expiration_passeport="L’expiration ne peut pas précéder la délivrance."
  return {values,errors}
}

export function generateActorId(kind:ActorKind, rows:SheetRow[]):string {
  const {id,prefix}=actorConfig[kind]
  const ids=rows.map(r=>clean(r[id])).filter(Boolean)
  const parsed=ids.map(value=>value.match(/^(.*?)(\d+)$/)).filter((m):m is RegExpMatchArray=>Boolean(m))
  const preferred=parsed.find(m=>m[1]===prefix)??parsed[0]
  const actualPrefix=preferred?.[1]??prefix
  const width=preferred?.[2].length??5
  const numbers=parsed.filter(m=>m[1]===actualPrefix).map(m=>Number(m[2])).filter(Number.isFinite)
  let next=Math.max(0,...numbers)+1
  const used=new Set(ids)
  let candidate=`${actualPrefix}${String(next).padStart(width,"0")}`
  while(used.has(candidate)){next++;candidate=`${actualPrefix}${String(next).padStart(width,"0")}`}
  return candidate
}

export function normalizeActor(kind:ActorKind,row:SheetRow,references:{coachLevels?:SheetRow[]}={}):Record<string,string>{
  const config=actorConfig[kind]
  const result:Record<string,string>={id:pickFirst(row,[config.id]),[config.id]:pickFirst(row,[config.id])}
  for(const field of fieldsFor(kind)) result[field]=pickFirst(row,physicalAliases[field]??[field])
  result.id_sexe=normalizeSexId(result.id_sexe)
  result.avatarUrl=result.avatar_drive_url
  result.idNational=result.id_national; result.idInternational=result.id_international; result.idFiba=result.id_international
  result.nomComplet=result.nom_complet; result.dateNaissance=result.date_de_naissance; result.lieuNaissance=result.lieu_de_naissance
  const parts=result.nom_complet.split(/\s+/).filter(Boolean); result.prenom=parts.length>1?parts[0]:""; result.nom=parts.length>1?parts.slice(1).join(" "):parts[0]??""
  result.sexe=result.id_sexe==="SEX001"?"M":result.id_sexe==="SEX002"?"F":"Autre"
  result.observation=result.observations
  // Valeurs historiques exposées en lecture seule pour les écrans existants.
  result.id_niveau=pickFirst(row,["id_niveau_coach_historique","id_niveau","id_niveau_coach"])
  const coachLevel=references.coachLevels?.find(item=>pickFirst(item,["id_niveau_coach"])===result.id_niveau)
  result.niveau=pickFirst(coachLevel||{},["nom_niveau_coach"])||result.id_niveau
  result.grade=pickFirst(row,["id_grade_arbitre_historique","id_grade_arbitre","grade"])
  result.specialite=pickFirst(row,["id_specialite_sante","id_specialite","specialite"])
  result.fonction=pickFirst(row,["fonction"]);result.structure=pickFirst(row,["structure"]);result.structureMedicale=pickFirst(row,["structure_medicale"])
  return result
}

type ActorDeps={readRows:typeof readSheetRows;writeRow:typeof writeSheetRowByHeaders}
const defaultDeps:ActorDeps={readRows:readSheetRows,writeRow:writeSheetRowByHeaders}
async function requireReference(deps:ActorDeps,sheet:string,id:string,field:string,required=false){
  let rows:SheetRow[]
  try{rows=await deps.readRows({block:"referentiel",sheet,range:"A:F"})}catch{throw new ActorError("REFERENTIEL_INDISPONIBLE",`Le référentiel ${sheet} est indisponible.`,503,{[field]:"Liste indisponible."})}
  if(required&&!rows.length) throw new ActorError("REFERENTIEL_VIDE",`Le référentiel ${sheet} est vide.`,503,{[field]:"Aucune valeur n’est configurée."})
  if(!id)return
  const idKey=Object.keys(rows[0]??{}).find(k=>k.startsWith("id_"))
  if(!idKey||!rows.some(r=>clean(r[idKey])===id)) throw new ActorError("REFERENCE_INVALIDE","Une valeur de référentiel est invalide.",422,{[field]:"Valeur inconnue."})
}

export async function mutateActor(kind:ActorKind,mode:"create"|"update",body:unknown,id?:string,deps:ActorDeps=defaultDeps){
  const config=actorConfig[kind]
  const rows=await deps.readRows({block:"acteurs",sheet:config.sheet,range:"A:ZZ"})
  const requestedId=clean(id)
  const current=mode==="update"?rows.find(r=>clean(r[config.id])===requestedId):undefined
  if(mode==="update"&&!current) throw new ActorError("INTROUVABLE","L’acteur demandé n’existe pas.",404)
  const source=body&&typeof body==="object"?body as Record<string,unknown>:{}
  const merged=mode==="update"&&current
    ? Object.fromEntries(fieldsFor(kind).map(field=>[field,Object.prototype.hasOwnProperty.call(source,field)?source[field]:normalizeActor(kind,current)[field]]))
    : body
  const {values,errors}=validateActorInput(kind,merged)
  if(Object.keys(errors).length) throw new ActorError("VALIDATION","Veuillez corriger les champs indiqués.",422,errors)
  await requireReference(deps,"SEXES",values.id_sexe,"id_sexe")
  if(kind==="medecins") await requireReference(deps,"SPECIALITES_MEDECINS",values.id_specialite_sante,"id_specialite_sante",true)
  if(kind==="autres") await requireReference(deps,"TYPES_AUTRES_ACTEURS",values.id_type_autre_acteur,"id_type_autre_acteur",true)
  const entityId=mode==="create"?generateActorId(kind,rows):clean(id)
  const duplicate=(field:string)=>values[field]&&rows.some(r=>clean(r[config.id])!==entityId&&pickFirst(r,physicalAliases[field]??[field])===values[field])
  for(const field of ["id_national","id_international"]) if(duplicate(field)) throw new ActorError("IDENTIFIANT_DUPLIQUE","Cet identifiant est déjà attribué dans cette catégorie.",409,{[field]:"Identifiant déjà utilisé."})
  const headers=new Set(physicalHeaders[kind])
  const physical:Record<string,string>={}
  for(const [field,value] of Object.entries(values)){
    const target=(physicalAliases[field]??[field]).find(candidate=>headers.has(candidate))
    if(target) physical[target]=value
    else if(value) throw new ActorError("SCHEMA_INCOMPATIBLE",`La colonne ${field} est absente de la feuille ${config.sheet}.`,503,{[field]:"Colonne non configurée dans Google Sheets."})
  }
  try{
    await deps.writeRow({block:"acteurs",sheet:config.sheet,idHeader:config.id,id:entityId,values:physical,mode})
    const reread=await deps.readRows({block:"acteurs",sheet:config.sheet,range:"A:ZZ"})
    const written=reread.find(r=>clean(r[config.id])===entityId)
    if(!written) throw new Error("RELECTURE_ECHOUEE")
    return normalizeActor(kind,written)
  }catch(error){
    if(error instanceof ActorError)throw error
    const code=error instanceof Error?error.message:""
    if(code==="IDENTIFIANT_DUPLIQUE")throw new ActorError(code,"Cet identifiant existe déjà.",409)
    if(code==="INTROUVABLE")throw new ActorError(code,"L’acteur demandé n’existe pas.",404)
    if(code==="SCHEMA_INDISPONIBLE")throw new ActorError(code,"Le schéma Google Sheets est incompatible.",503)
    throw new ActorError("SERVICE_INDISPONIBLE","L’écriture Google Sheets est temporairement indisponible.",503)
  }
}

export function sortActorsAlphabetically<T extends Record<string,string>>(actors:T[]):T[]{
  return [...actors].sort((a,b)=>a.nom_complet.localeCompare(b.nom_complet,"fr",{sensitivity:"base",ignorePunctuation:true}))
}

export async function listActors(kind:ActorKind){
  const config=actorConfig[kind]
  const [rows,coachLevels]=await Promise.all([
    readSheetRows({block:"acteurs",sheet:config.sheet,range:"A:ZZ"}),
    kind==="coachs"?readSheetRows({block:"referentiel",sheet:"NIVEAUX_COACH",range:"A:C"}).catch(()=>[]):Promise.resolve([]),
  ])
  return sortActorsAlphabetically(rows
    .filter(r=>pickFirst(r,[config.id]))
    .map(r=>normalizeActor(kind,r,{coachLevels})))
}
