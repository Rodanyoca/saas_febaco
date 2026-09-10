import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-session"
import { listActors } from "@/lib/actors"
import { handleActorWrite } from "@/app/api/_actor-write"
export const dynamic="force-dynamic"
export async function GET(request:Request){if(!await getSessionUser())return NextResponse.json({error:"Non authentifié."},{status:401});try{const id=new URL(request.url).searchParams.get("id")?.trim().toLowerCase();let autres=await listActors("autres");if(id)autres=autres.filter(a=>a.id.toLowerCase()===id);return NextResponse.json({autres})}catch(error){return NextResponse.json({autres:[],error:error instanceof Error?error.message:"Lecture impossible."},{status:500})}}
export async function POST(request:Request){return handleActorWrite(request,"autres","create")}
