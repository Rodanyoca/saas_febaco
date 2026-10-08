import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-session"
import { getDataQuality } from "@/lib/data-quality/service"

export const dynamic="force-dynamic"
export async function GET(request:Request){const user=await getSessionUser();if(!user)return NextResponse.json({error:"Non authentifié."},{status:401});try{const query=new URL(request.url).searchParams,seasonId=query.get("seasonId")||"",fresh=query.get("fresh")==="1"&&user.role==="federal";const result=await getDataQuality(user,seasonId,fresh);return NextResponse.json(result.summary)}catch(error){console.error("[data-quality] synthèse indisponible",error);return NextResponse.json({error:"Qualité des données momentanément indisponible."},{status:503})}}
export async function POST(request:Request){const user=await getSessionUser();if(!user)return NextResponse.json({error:"Non authentifié."},{status:401});if(user.role!=="federal")return NextResponse.json({error:"Action réservée au niveau fédéral."},{status:403});try{const body=await request.json().catch(()=>({}));const result=await getDataQuality(user,String(body?.seasonId??""),true);return NextResponse.json(result.summary)}catch(error){console.error("[data-quality] recalcul impossible",error);return NextResponse.json({error:"Recalcul momentanément indisponible."},{status:503})}}
