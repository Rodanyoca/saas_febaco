import { protectedRoute } from "@/lib/auth/guard"
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { listAllCompetitionResults } from "@/lib/competition-play";

export const dynamic = "force-dynamic";
async function GETHandler(request: Request) {
  if (!(await getSessionUser())) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  try {
    const competitionId = new URL(request.url).searchParams.get("competitionId")?.trim() ?? "";
    let resultats = await listAllCompetitionResults();
    if (competitionId) resultats = resultats.filter((row) => row.competitionId === competitionId);
    return NextResponse.json({ resultats });
  } catch (error) { return NextResponse.json({ resultats: [], error: error instanceof Error ? error.message : "Lecture impossible." }, { status: 500 }); }
}

export const GET = protectedRoute(GETHandler)
