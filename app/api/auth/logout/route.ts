import { NextResponse } from "next/server"
import { clearSessionCookie, getResolvedSession } from "@/lib/auth-session"
import { isMutationOriginAllowed } from "@/lib/auth/request-origin"
import { createGoogleUsersSheetsAdapter } from "@/lib/users/google-adapter"
import { writeAudit } from "@/lib/audit/logger"
import { randomUUID } from "node:crypto"
import { getUserById } from "@/lib/users/data"
export async function POST(request:Request){
 if(!isMutationOriginAllowed(request))return NextResponse.json({error:"Origine refusee."},{status:403})
 let journalUnavailable=false
 try {const session=await getResolvedSession();if(session){const current=await getUserById(session.user.idUser,true);const adapter=createGoogleUsersSheetsAdapter();if(current&&current.sessionVersion===session.user.sessionVersion)await adapter.updateRow!("USERS","id_user",current.idUser,{session_version:String(current.sessionVersion+1)});await writeAudit({adapter,actorId:session.user.idUser,action:"LOGOUT",typeObjet:"SESSION",result:"SUCCES",requestId:randomUUID()})}} catch {journalUnavailable=true}
 await clearSessionCookie()
 return NextResponse.json({ok:true,revocationConfirmed:!journalUnavailable},{headers:{"Cache-Control":"private, no-store"}})
}
