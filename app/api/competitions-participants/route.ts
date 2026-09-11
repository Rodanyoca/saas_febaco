import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { listAllCompetitionParticipants } from "@/lib/competition-participants";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await getSessionUser())) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  try { return NextResponse.json({ participants: await listAllCompetitionParticipants() }); }
  catch { return NextResponse.json({ participants: [], error: "Lecture des participations impossible." }, { status: 503 }); }
}
