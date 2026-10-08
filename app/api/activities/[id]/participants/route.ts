import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-session"
import { saveActivityParticipant } from "@/lib/activities"
async function write(request:Request,params:Promise<{id:string}>,update=false){const user=await getSessionUser();if(!user)return NextResponse.json({error:"Authentification requise."},{status:401});if(user.role!=="federal")return NextResponse.json({error:"Action réservée au niveau fédéral."},{status:403});try{const body=await request.json(),{id}=await params;return NextResponse.json(await saveActivityParticipant(decodeURIComponent(id),body.row||{},update?String(body.id||""):undefined))}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Enregistrement impossible."},{status:422})}}
export async function POST(r:Request,c:{params:Promise<{id:string}>}){return write(r,c.params)}export async function PUT(r:Request,c:{params:Promise<{id:string}>}){return write(r,c.params,true)}
