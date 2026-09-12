import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { readSheetRows, writeSheetRowByHeaders } from "@/lib/google-sheets";
import { requireMutableEdition } from "@/lib/competition-lifecycle";
export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){
 const user=await getSessionUser();if(!user)return NextResponse.json({error:{message:"Authentification requise."}},{status:401});if(user.role!=="federal")return NextResponse.json({error:{message:"Droit fédéral requis."}},{status:403});
 try{const id=decodeURIComponent((await params).id),rows=await readSheetRows({block:"competitions",sheet:"COMPETITIONS",range:"A:ZZ"});requireMutableEdition(rows,id);await writeSheetRowByHeaders({block:"competitions",sheet:"COMPETITIONS",idHeader:"id_competition",id,mode:"update",values:{statut:"TERMINEE"}});return NextResponse.json({id,statut:"TERMINEE"});}catch(error){const e=error as {status?:number;code?:string;message?:string};return NextResponse.json({error:{code:e.code||"SERVICE_INDISPONIBLE",message:e.status?e.message:"Service temporairement indisponible."}},{status:e.status||503})}
}
