import type { AuthorizationRequirement } from "./authorization"
export function routePolicy(path:string):AuthorizationRequirement|null{
  const p=path.replace(/^\/dashboard(?=\/|$)/,"")||"/"
  if(/^\/(?:api\/)?parametres(?:\/|$)/.test(p))return {scope:"SUPER_ADMIN"}
  if(/^\/(?:api\/)?(?:activities|activites|documents)(?:\/|$)/.test(p))return {scope:"BUSINESS",blocks:["AUT-ADM"]}
  if(p==="/"||/^\/(?:api\/)?(?:dashboard|ligues|ententes|clubs|equipes|athletes|coachs|arbitres|officiels|medecins|autres|acteurs|affiliations|athlete-affiliations|athlete-licences|actor-licences|licences|competitions(?:-[a-z]+)?|equipe-nationale(?:-[a-z]+)?|equipes-nationales|structure-territoriale|upload|media)(?:\/|$)/.test(p))return {scope:"BUSINESS",blocks:["AUT-SPT"]}
  return null
}
