import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { scopeFromSession } from "@/lib/auth-scope";
import { listAthleteLicences } from "@/lib/licences";
import { licenceFailure } from "@/app/api/licences/_response";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const athleteId = new URL(request.url).searchParams.get("athleteId")?.trim() || "";
  if (!athleteId) return NextResponse.json({ licences: [], error: "id_athlete requis." }, { status: 400 });
  try {
    const data = await listAthleteLicences({ athleteId }, scopeFromSession(user));
    return NextResponse.json({ licences: data.licences });
  } catch (error) { return licenceFailure(error); }
}
