import { cookies } from "next/headers"
import { AUTH_COOKIE_NAME } from "./auth-constants"
import { createSessionToken } from "./auth/session-token"
import { sessionCookieOptions } from "./auth/session-cookie"
import { resolveSession } from "./auth/session-resolution"
import { sessionSecret } from "./auth/config"
import { getUserById,getAuthorizationsForUser } from "./users/data"
import { authorize } from "./auth/authorization"
import { currentDataScope,currentAuthorizationSnapshot } from "./auth/data-context"
export type UserRole = "federal" | "ligue" | "entente"
export type SessionUser = { email:string;nom?:string;role:UserRole;ligueId?:string;ententeId?:string;idUser?:string;sessionVersion?:number;typeUser?:"ADMIN"|"VIEWER";estSuperAdmin?:boolean;doitChangerMotDePasse?:boolean;readBlocks?:string[] }
export async function getResolvedSession() {
 const token=(await cookies()).get(AUTH_COOKIE_NAME)?.value
 if (!token) return null
 const result=await resolveSession({token,secret:sessionSecret(),loadUser:getUserById})
 if(!result.ok && result.reason==="SOURCE_UNAVAILABLE")throw new Error("Source de session indisponible.")
 return result.ok ? result : null
}
export async function getSessionUser():Promise<SessionUser|null>{
 const snapshot=currentAuthorizationSnapshot(),session=snapshot?{user:snapshot.user}:await getResolvedSession()
 if(!session)return null
 const u=session.user
 const scope=currentDataScope()
 const grants=snapshot?[]:await getAuthorizationsForUser(u.idUser),readBlocks=snapshot?snapshot.readBlocks:(["AUT-ADM","AUT-SPT","AUT-COM"] as const).filter(block=>authorize({user:u,authorizations:grants,requirement:{scope:"BUSINESS",blocks:[block]},action:"READ"}).allowed)
 return {email:u.email,nom:u.nomComplet,role:u.idEntente?"entente":u.idLigue?"ligue":"federal",ligueId:scope?[...scope.ligues][0]:u.idLigue,ententeId:u.idEntente&&scope?[...scope.ententes][0]:u.idEntente,idUser:u.idUser,sessionVersion:u.sessionVersion,typeUser:u.typeUser,estSuperAdmin:u.estSuperAdmin,doitChangerMotDePasse:u.doitChangerMotDePasse,readBlocks}
}
export async function createSession(input:{idUser:string;sessionVersion:number}){
 const value=await createSessionToken({...input,secret:sessionSecret()})
 ;(await cookies()).set(AUTH_COOKIE_NAME,value,sessionCookieOptions(process.env.NODE_ENV==="production"))
}
export async function clearSessionCookie(){(await cookies()).delete(AUTH_COOKIE_NAME)}
