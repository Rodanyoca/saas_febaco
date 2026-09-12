import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { listAllCompetitionStandings } from "@/lib/competition-play";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!(await getSessionUser())) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  try {
    const competitionId = new URL(request.url).searchParams.get("competitionId")?.trim() ?? "";
    let classements = await listAllCompetitionStandings();
    if (competitionId) classements = classements.filter((row) => row.competitionId === competitionId);
    return NextResponse.json({ classements });
  } catch (error) { return NextResponse.json({ classements: [], error: error instanceof Error ? error.message : "Lecture impossible." }, { status: 500 }); }
}
