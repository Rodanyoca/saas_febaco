import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { getCompetitionReferences } from "@/lib/competitions";

export async function GET() {
  if (!(await getSessionUser()))
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  try {
    return NextResponse.json(await getCompetitionReferences());
  } catch {
    return NextResponse.json(
      { error: "Référentiels temporairement indisponibles." },
      { status: 503 },
    );
  }
}
