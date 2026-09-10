import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-session"
import { ActorError, mutateActor, type ActorKind } from "@/lib/actors"

export async function handleActorWrite(request:Request,kind:ActorKind,mode:"create"|"update",id?:string){
  const user=await getSessionUser()
  if(!user)return NextResponse.json({error:{code:"NON_AUTHENTIFIE",message:"Authentification requise."}},{status:401})
  if(user.role!=="federal")return NextResponse.json({error:{code:"ECRITURE_REFUSEE",message:"Vous ne disposez pas du droit d’écriture."}},{status:403})
  try{
    const actor=await mutateActor(kind,mode,await request.json().catch(()=>null),id)
    return NextResponse.json({actor},{status:mode==="create"?201:200})
  }catch(error){
    if(error instanceof ActorError)return NextResponse.json({error:{code:error.code,message:error.message,fields:error.fields}},{status:error.status})
    return NextResponse.json({error:{code:"SERVICE_INDISPONIBLE",message:"Service temporairement indisponible."}},{status:503})
  }
}
