import { NextResponse } from "next/server";
import { LicenceError } from "@/lib/licences";

export function licenceFailure(error: unknown) {
  if (error instanceof LicenceError) return NextResponse.json({ error: { code: error.code, message: error.message, fields: error.fields } }, { status: error.status });
  console.error("[licences] Erreur interne", error);
  return NextResponse.json({ error: { code: "SERVICE_INDISPONIBLE", message: "Service temporairement indisponible." } }, { status: 500 });
}
