import { NextResponse, type NextRequest } from "next/server"
import { AUTH_COOKIE_NAME } from "@/lib/auth-constants"
import { resolveSession } from "@/lib/auth/session-resolution"
import { sessionSecret } from "@/lib/auth/config"
import { getUserById, getAuthorizationsForUser } from "@/lib/users/data"
import { authorize } from "@/lib/auth/authorization"
import { routePolicy } from "@/lib/auth/route-policy"
import { isMutationOriginAllowed,publicRequestOrigin } from "@/lib/auth/request-origin"
const publicAssets=new Set(["/favicon.ico", "/apple-icon.png", "/icon-dark-32x32.png", "/icon-light-32x32.png", "/icon.svg", "/placeholder-logo.png", "/placeholder-logo.svg", "/placeholder-user.jpg", "/placeholder.jpg", "/placeholder.svg", "/images/equipe-nationale-rdc.jpg", "/images/logo-febaco.png", "/images/logo-febadco.jpg"])
const accountPaths=new Set(["/activation","/mon-compte","/api/auth/me","/api/auth/session","/api/auth/activate","/api/auth/change-password"])
function deny(request:NextRequest,status:number){
 const response=request.nextUrl.pathname.startsWith("/api/")?NextResponse.json({error:"Acces refuse."},{status}):NextResponse.redirect(new URL(status===503?"/service-indisponible":status===401?"/login":"/acces-refuse",publicRequestOrigin(request)))
 response.headers.set("Cache-Control","private, no-store");return response
}
export async function proxy(request:NextRequest){
 const path=request.nextUrl.pathname
 if((path.startsWith("/_next/")||publicAssets.has(path)||path==="/_vercel/insights/script.js")&&["GET","HEAD"].includes(request.method))return NextResponse.next()
 if(!isMutationOriginAllowed(request))return deny(request,403)
 if(["/login","/service-indisponible","/api/auth/login"].includes(path))return NextResponse.next()
 if(path==="/api/auth/logout")return NextResponse.next()
 const token=request.cookies.get(AUTH_COOKIE_NAME)?.value
 if(!token)return deny(request,401)
 try{
  const result=await resolveSession({token,secret:sessionSecret(),loadUser:getUserById})
  if(!result.ok)return deny(request,result.reason==="SOURCE_UNAVAILABLE"?503:401)
  if(result.requiresActivation && !["/activation","/api/auth/activate","/api/auth/me","/api/auth/session"].includes(path))return path.startsWith("/api/")?deny(request,403):NextResponse.redirect(new URL("/activation",publicRequestOrigin(request)))
  if(accountPaths.has(path)||path==="/acces-refuse")return NextResponse.next()
  const requirement=routePolicy(path)
  if(!requirement)return deny(request,403)
  const writing=!["GET","HEAD","OPTIONS"].includes(request.method)
  if(writing&&(result.user.idLigue||result.user.idEntente))return deny(request,403)
  if(!authorize({user:result.user,authorizations:await getAuthorizationsForUser(result.user.idUser),requirement,action:writing?"WRITE":"READ"}).allowed)return deny(request,403)
  const response=NextResponse.next();response.headers.set("Cache-Control","private, no-store");return response
 }catch{return deny(request,503)}
}
export const config={matcher:["/:path*"]}
