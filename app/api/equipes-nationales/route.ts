import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-session"
import { getNationalTeamsDashboard, mutateNationalTeam, NationalTeamError } from "@/lib/national-teams"

export const dynamic = "force-dynamic"
export async function GET(){const user=await getSessionUser();if(!user)return NextResponse.json({error:"Non authentifié."},{status:401});try{return NextResponse.json(await getNationalTeamsDashboard())}catch(error){console.error("[equipes-nationales] Lecture impossible",error);return NextResponse.json({error:"Service temporairement indisponible."},{status:503})}}
export async function POST(request:Request){const user=await getSessionUser();if(!user)return NextResponse.json({error:"Non authentifié."},{status:401});if(user.role!=="federal")return NextResponse.json({error:"Droit fédéral requis."},{status:403});try{const body=await request.json(),data=await mutateNationalTeam(String(body?.action||""),body?.values);return NextResponse.json({data},{status:201})}catch(error){if(error instanceof NationalTeamError)return NextResponse.json({error:error.message,code:error.code,fields:error.fields},{status:error.status});console.error("[equipes-nationales] Écriture impossible",error);return NextResponse.json({error:"Service temporairement indisponible."},{status:503})}}
