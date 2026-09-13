import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { scopeFromSession } from "@/lib/auth-scope";
import { listAthleteLicences } from "@/lib/licences";
import { licenceFailure } from "@/app/api/licences/_response";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: { code: "NON_AUTHENTIFIE", message: "Authentification requise." } }, { status: 401 });
  try {
    const query = new URL(request.url).searchParams;
    return NextResponse.json(await listAthleteLicences({ seasonId: query.get("saison") || "", teamId: query.get("equipe") || "", statusId: query.get("statut") || "", athleteId: query.get("athlete") || "", search: query.get("recherche") || "" }, scopeFromSession(user)));
  } catch (error) { return licenceFailure(error); }
}
