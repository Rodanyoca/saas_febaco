import type { User } from "../users/types"
import { resolveTerritorialId } from "./territorial-id"
type Row = Record<string,string>
export type ScopeIndex = { ligues:Set<string>;ententes:Set<string>;clubs:Set<string>;teams:Set<string>;actors:Record<string,Set<string>>;ententeOnly:boolean;athleteAffiliations:Set<string>;activities:Set<string>;documents:Set<string> }
const id=(value:unknown)=>String(value??"").trim()
export function buildScopeIndex(user:Pick<User,"idLigue"|"idEntente">,rows:Record<string,Row[]>):ScopeIndex {
  const rawEntentes=rows.ENTENTES||[],leagueRows=[...new Set(rawEntentes.map(r=>id(r.id_ligue)))].map(id_ligue=>({id_ligue}))
  const ligueId=resolveTerritorialId(user.idLigue,rows.LIGUES||leagueRows,"id_ligue"),ententeId=resolveTerritorialId(user.idEntente,rawEntentes,"id_entente")
  if((user.idLigue&&!ligueId)||(user.idEntente&&!ententeId))throw new Error("Rattachement absent ou ambigu.")
  const ententes=rawEntentes.filter(r=>user.idEntente?id(r.id_entente)===ententeId:id(r.id_ligue)===ligueId)
  if(user.idEntente && (!ententes.length || (user.idLigue && id(ententes[0].id_ligue)!==ligueId)))throw new Error("Rattachement incohérent.")
  if(!user.idEntente&&!user.idLigue)throw new Error("Périmètre absent.")
  const allowedEntentes=new Set(ententes.map(r=>id(r.id_entente))),ligues=new Set(ententes.map(r=>id(r.id_ligue)))
  if(ligueId)ligues.add(ligueId)
  const clubs=new Set((rows.CLUBS||[]).filter(r=>allowedEntentes.has(id(r.id_entente))).map(r=>id(r.id_club)))
  const teams=new Set((rows.EQUIPES||[]).filter(r=>clubs.has(id(r.id_club))).map(r=>id(r.id_equipe)))
  const actors:Record<string,Set<string>>={}
  for(const [sheet,affiliation,key] of [["ATHLETES","ATHLETE_AFFILIATIONS","id_athlete"],["COACHS","COACH_AFFILIATIONS","id_coach"],["MEDECINS","MEDECINS_AFFILIATIONS","id_medecin"]])actors[sheet]=new Set((rows[affiliation]||[]).filter(r=>teams.has(id(r.id_equipe))).map(r=>id(r[key])))
  const entity=(r:Row)=>r.id_type_entite==="STR001"?!user.idEntente&&ligues.has(id(r.id_entite)):r.id_type_entite==="STR002"?allowedEntentes.has(id(r.id_entite)):r.id_type_entite==="STR003"?clubs.has(id(r.id_entite)):false
  actors.OFFICIELS=new Set((rows.OFFICIELS_AFFILIATIONS||[]).filter(entity).map(r=>id(r.id_officiel)))
  const athleteAffiliations=new Set((rows.ATHLETE_AFFILIATIONS||[]).filter(r=>teams.has(id(r.id_equipe))).map(r=>id(r.id_affiliation_athlete)).filter(Boolean))
  const scope:ScopeIndex={ligues,ententes:allowedEntentes,clubs,teams,actors,ententeOnly:Boolean(user.idEntente),athleteAffiliations,activities:new Set(),documents:new Set()}
  const structureEntities=new Set([...(!scope.ententeOnly?[...ligues]:[]),...allowedEntentes,...clubs,...teams])
  for(const row of rows.ACTIVITES||[])if(structureEntities.has(id(row.id_entite_organisatrice)))scope.activities.add(id(row.id_activite))
  for(const row of rows.ACTIVITES_ENTITES||[])if(structureEntities.has(id(row.id_entite)))scope.activities.add(id(row.id_activite))
  for(const row of rows.ACTIVITES_PARTICIPANTS||[])if(scopeActorAllowed(row,scope))scope.activities.add(id(row.id_activite))
  for(const row of rows.DOCUMENTS_RELATIONS||[])if(scopeEntityAllowed(row,scope))scope.documents.add(id(row.id_document))
  return scope
}
function scopeActorAllowed(row:Row,scope:ScopeIndex){const family:Record<string,string>={TAC001:"ATHLETES",TAC002:"COACHS",TAC003:"OFFICIELS",TAC005:"MEDECINS"};return Boolean(scope.actors[family[row.id_type_acteur]]?.has(id(row.id_acteur)))}
function scopeEntityAllowed(row:Row,scope:ScopeIndex){
  const type=row.id_type_entite,value=id(row.id_entite)
  const structures:Record<string,Set<string>>={LIGUE:scope.ententeOnly?new Set():scope.ligues,ENTENTE:scope.ententes,CLUB:scope.clubs,EQUIPE:scope.teams,STR001:scope.ententeOnly?new Set():scope.ligues,STR002:scope.ententes,STR003:scope.clubs}
  if(structures[type])return structures[type].has(value)
  return scopeActorAllowed({id_type_acteur:type,id_acteur:value},scope)
}
export function filterTerritorialRows(sheet:string,rows:Row[],scope:ScopeIndex):Row[]{
  const name=sheet.toUpperCase(), direct:Record<string,[Set<string>,string]>={LIGUES:[scope.ligues,"id_ligue"],ENTENTES:[scope.ententes,"id_entente"],CLUBS:[scope.clubs,"id_club"],EQUIPES:[scope.teams,"id_equipe"],ATHLETES:[scope.actors.ATHLETES,"id_athlete"],COACHS:[scope.actors.COACHS,"id_coach"],MEDECINS:[scope.actors.MEDECINS,"id_medecin"],OFFICIELS:[scope.actors.OFFICIELS,"id_officiel"]}
  const rule=direct[name]
  if(rule)return rows.filter(r=>rule[0].has(id(r[rule[1]])))
  if(["ATHLETE_AFFILIATIONS","COACH_AFFILIATIONS","MEDECINS_AFFILIATIONS"].includes(name))return rows.filter(r=>scope.teams.has(id(r.id_equipe)))
  if(name==="OFFICIELS_AFFILIATIONS")return rows.filter(r=>scope.actors.OFFICIELS.has(id(r.id_officiel))&&((!scope.ententeOnly&&r.id_type_entite==="STR001"&&scope.ligues.has(id(r.id_entite)))||(r.id_type_entite==="STR002"&&scope.ententes.has(id(r.id_entite)))||(r.id_type_entite==="STR003"&&scope.clubs.has(id(r.id_entite)))))
  if(name==="ATHLETE_LICENCES")return rows.filter(r=>scope.actors.ATHLETES.has(id(r.id_athlete))&&scope.athleteAffiliations.has(id(r.id_affiliation_athlete)))
  if(name==="ACTEURS_LICENCES")return rows.filter(r=>({TAC002:scope.actors.COACHS,TAC003:scope.actors.OFFICIELS,TAC005:scope.actors.MEDECINS} as Record<string,Set<string>>)[r.id_type_acteur]?.has(id(r.id_acteur)))
  if(name==="ACTIVITES")return rows.filter(r=>scope.activities.has(id(r.id_activite)))
  if(name==="ACTIVITES_ENTITES")return rows.filter(r=>scope.activities.has(id(r.id_activite))&&new Set([...(!scope.ententeOnly?[...scope.ligues]:[]),...scope.ententes,...scope.clubs,...scope.teams]).has(id(r.id_entite)))
  if(name==="ACTIVITES_PARTICIPANTS")return rows.filter(r=>scope.activities.has(id(r.id_activite))&&scopeActorAllowed(r,scope))
  if(name==="DOCUMENTS"||name==="DOCUMENTS_FICHIERS")return rows.filter(r=>scope.documents.has(id(r.id_document)))
  if(name==="DOCUMENTS_RELATIONS")return rows.filter(r=>scope.documents.has(id(r.id_document))&&scopeEntityAllowed(r,scope))
  // No affiliation model exists for these families: no inference of wider access.
  if(["ARBITRES","AUTRES"].includes(name))return rows.filter(r=>r.id_entente?scope.ententes.has(id(r.id_entente)):r.id_ligue?scope.ligues.has(id(r.id_ligue)):false)
  return rows
}
