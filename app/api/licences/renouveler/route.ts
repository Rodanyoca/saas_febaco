import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { renewAthleteLicences } from "@/lib/licences";
import { licenceFailure } from "@/app/api/licences/_response";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: { code: "NON_AUTHENTIFIE", message: "Authentification requise." } }, { status: 401 });
  if (user.role !== "federal") return NextResponse.json({ error: { code: "ECRITURE_REFUSEE", message: "Droit fédéral requis." } }, { status: 403 });
  try { return NextResponse.json({ licences: await renewAthleteLicences(await request.json().catch(() => null)) }, { status: 201 }); }
  catch (error) { return licenceFailure(error); }
}
