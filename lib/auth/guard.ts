import { NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { redirect } from "next/navigation"
import { getResolvedSession } from "../auth-session"
import { getAuthorizationsForUser } from "../users/data"
import { createGoogleUsersSheetsAdapter } from "../users/google-adapter"
import { authorize, kinshasaCalendarDate } from "./authorization"
import { routePolicy } from "./route-policy"
import { isMutationOriginAllowed } from "./request-origin"
import { withDataScope } from "./data-context"
import { loadScopeIndex } from "./scope-source"
import { writeAudit } from "../audit/logger"

export class AccessDenied extends Error { constructor(public status:number){super("Accès refusé.")} }
export async function authorizePath(path:string,method="GET"){
  const session=await getResolvedSession()
  if(!session)throw new AccessDenied(401)
  if(session.requiresActivation)throw new AccessDenied(403)
  const requirement=routePolicy(path)
  if(!requirement)throw new AccessDenied(403)
  const writing=!["GET","HEAD","OPTIONS"].includes(method)
  // FEBACO legacy writes were federal-only. ADMIN cannot widen that territory rule.
  if(writing&&(session.user.idLigue||session.user.idEntente))throw new AccessDenied(403)
  const authorizations=await getAuthorizationsForUser(session.user.idUser)
  const decision=authorize({user:session.user,authorizations,requirement,action:writing?"WRITE":"READ"})
  if(!decision.allowed)throw new AccessDenied(403)
  return {...session,authorizations}
}
export function protectedRoute<Args extends unknown[]>(handler:(request:Request,...args:Args)=>Response|undefined|Promise<Response|undefined>){
  return async (request:Request,...args:Args):Promise<Response>=>{
    if(!isMutationOriginAllowed(request))return NextResponse.json({error:"Origine refusée."},{status:403})
    let session:Awaited<ReturnType<typeof authorizePath>>|undefined
    const requestId=randomUUID(),mutation=!["GET","HEAD","OPTIONS"].includes(request.method),path=new URL(request.url).pathname
    try {
      session=await authorizePath(path,request.method)
      const date=kinshasaCalendarDate()
      const readBlocks=(["AUT-ADM","AUT-SPT","AUT-COM"] as const).filter(block=>authorize({user:session!.user,authorizations:session!.authorizations,requirement:{scope:"BUSINESS",blocks:[block]},action:"READ",date}).allowed)
      const allowAdmin=readBlocks.includes("AUT-ADM")
      const scope=await loadScopeIndex(session.user,allowAdmin&&/\/(?:activities|activites|documents|dashboard)(?:\/|$)/.test(path))
      if(mutation)await writeAudit({adapter:createGoogleUsersSheetsAdapter(),actorId:session.user.idUser,action:request.method+"_DEMANDE",typeObjet:"METIER",result:"SUCCES",requestId:requestId+":request",details:{method:request.method}})
      const response=await withDataScope(scope,()=>handler(request,...args),{allowAdmin,authorization:{user:Object.freeze({...session.user}),readBlocks}})
      if(!response)throw new Error("Réponse métier absente.")
      if(mutation)await writeAudit({adapter:createGoogleUsersSheetsAdapter(),actorId:session.user.idUser,action:request.method,typeObjet:"METIER",result:response.ok?"SUCCES":"ECHEC",requestId,details:{method:request.method,status:response.status}})
      response.headers.set("Cache-Control","private, no-store")
      return response
    } catch(error) {
      const status=error instanceof AccessDenied?error.status:503
      if(mutation)await writeAudit({adapter:createGoogleUsersSheetsAdapter(),actorId:session?.user.idUser,action:request.method,typeObjet:"METIER",result:"ECHEC",requestId,details:{motif:"REFUS_GENERIQUE",status}}).catch(()=>undefined)
      return NextResponse.json({error:status===503?"Service momentanément indisponible.":"Accès refusé."},{status,headers:{"Cache-Control":"private, no-store"}})
    }
  }
}
export async function protectedPage<T>(path:string,render:()=>T|Promise<T>):Promise<T>{
  const session=await authorizePath(path).catch(error=>{if(error instanceof AccessDenied)redirect(error.status===401?"/login":"/acces-refuse");redirect("/service-indisponible")})
  const date=kinshasaCalendarDate()
  const readBlocks=(["AUT-ADM","AUT-SPT","AUT-COM"] as const).filter(block=>authorize({user:session.user,authorizations:session.authorizations,requirement:{scope:"BUSINESS",blocks:[block]},action:"READ",date}).allowed)
  const allowAdmin=readBlocks.includes("AUT-ADM")
  return withDataScope(await loadScopeIndex(session.user,allowAdmin),render,{allowAdmin,authorization:{user:Object.freeze({...session.user}),readBlocks}})
}
