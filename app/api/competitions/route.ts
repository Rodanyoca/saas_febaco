import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import {
  createCompetition,
  CompetitionError,
  listCompetitions,
} from "@/lib/competitions";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user)
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

    const filterCompetitionId =
      new URL(req.url).searchParams.get("competitionId")?.trim() ?? "";
    const all = await listCompetitions();
    const competitions = filterCompetitionId
      ? all.filter((item) => item.id === filterCompetitionId)
      : all;

    return NextResponse.json({ competitions });
  } catch {
    return NextResponse.json(
      { competitions: [], error: { code: "SERVICE_INDISPONIBLE", message: "Service temporairement indisponible." } },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json(
      {
        error: {
          code: "NON_AUTHENTIFIE",
          message: "Authentification requise.",
        },
      },
      { status: 401 },
    );
  if (user.role !== "federal")
    return NextResponse.json(
      { error: { code: "ECRITURE_REFUSEE", message: "Droit fédéral requis." } },
      { status: 403 },
    );
  try {
    return NextResponse.json(
      {
        competition: await createCompetition(await request.json().catch(() => null)),
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof CompetitionError)
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: error.message,
            fields: error.fields,
          },
        },
        { status: error.status },
      );
    return NextResponse.json(
      {
        error: {
          code: "SERVICE_INDISPONIBLE",
          message: "Service temporairement indisponible.",
        },
      },
      { status: 503 },
    );
  }
}
