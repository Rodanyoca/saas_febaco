import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-session"
import { listActors } from "@/lib/actors"
import { handleActorWrite } from "@/app/api/_actor-write"
export const dynamic="force-dynamic"
export async function GET(request:Request){if(!await getSessionUser())return NextResponse.json({error:"Non authentifié."},{status:401});try{const params=new URL(request.url).searchParams,id=params.get("id")?.trim().toLowerCase(),search=params.get("search")?.trim().toLowerCase();let actors=await listActors("coachs");if(id)actors=actors.filter(a=>a.id.toLowerCase()===id);if(search)actors=actors.filter(a=>Object.values(a).join(" ").toLowerCase().includes(search));return NextResponse.json({coachs:actors})}catch(error){return NextResponse.json({coachs:[],error:error instanceof Error?error.message:"Lecture impossible."},{status:500})}}
export async function POST(request:Request){return handleActorWrite(request,"coachs","create")}
