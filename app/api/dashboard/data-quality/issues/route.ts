import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-session"
import { filterIssues, getDataQuality } from "@/lib/data-quality/service"
export const dynamic="force-dynamic"
export async function GET(request:Request){const user=await getSessionUser();if(!user)return NextResponse.json({error:"Non authentifié."},{status:401});try{const q=new URL(request.url).searchParams,result=await getDataQuality(user,q.get("seasonId")||"");return NextResponse.json(filterIssues(result.issues,{block:q.get("block")||undefined,severity:q.get("severity")||undefined,code:q.get("code")||undefined,search:q.get("search")||undefined,page:Number(q.get("page")||1),pageSize:Number(q.get("pageSize")||25)}))}catch(error){console.error("[data-quality] anomalies indisponibles",error);return NextResponse.json({error:"Anomalies momentanément indisponibles."},{status:503})}}
