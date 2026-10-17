import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-session"
export const dynamic="force-dynamic"
export async function GET(){try {const user=await getSessionUser();return NextResponse.json({user},{status:user?200:401,headers:{"Cache-Control":"private, no-store"}})} catch {return NextResponse.json({error:"Session indisponible."},{status:503})}}
