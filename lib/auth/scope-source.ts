import { readSheetRowsBatch } from "../google-sheets"
import { buildScopeIndex } from "./territorial-scope"
import type { User } from "../users/types"
export async function loadScopeIndex(user:User,includeAdministration=false){
  if(!user.idLigue&&!user.idEntente)return null
  const [structure,affiliations]=await Promise.all([
    readSheetRowsBatch({block:"structure",sheets:["LIGUES","ENTENTES","CLUBS","EQUIPES"]}),
    readSheetRowsBatch({block:"affiliations",sheets:["ATHLETE_AFFILIATIONS","COACH_AFFILIATIONS","MEDECINS_AFFILIATIONS","OFFICIELS_AFFILIATIONS"]}),
  ])
  let administration:Record<string,Record<string,string>[]>={}
  if(includeAdministration){const [activities,documents]=await Promise.all([readSheetRowsBatch({block:"activities",sheets:["ACTIVITES","ACTIVITES_ENTITES","ACTIVITES_PARTICIPANTS"]}),readSheetRowsBatch({block:"documents",sheets:["DOCUMENTS_RELATIONS"]})]);administration={...activities,...documents}}
  return buildScopeIndex(user,{...structure,...affiliations,...administration})
}
