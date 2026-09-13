import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { scopeFromSession } from "@/lib/auth-scope";
import { getAthleteLicenceEligibility } from "@/lib/licences";
import { licenceFailure } from "@/app/api/licences/_response";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: { code: "NON_AUTHENTIFIE", message: "Authentification requise." } }, { status: 401 });
  const query = new URL(request.url).searchParams, mode = query.get("mode"), seasonId = query.get("id_saison") || "";
  try {
    if (mode === "ATHLETE") return NextResponse.json(await getAthleteLicenceEligibility({ mode, seasonId, athleteId: query.get("id_athlete") || "" }, scopeFromSession(user)));
    if (mode === "EQUIPE") return NextResponse.json(await getAthleteLicenceEligibility({ mode, seasonId, teamId: query.get("id_equipe") || "" }, scopeFromSession(user)));
    return NextResponse.json({ error: { code: "MODE_INVALIDE", message: "Mode d’éligibilité invalide." } }, { status: 400 });
  } catch (error) { return licenceFailure(error); }
}
