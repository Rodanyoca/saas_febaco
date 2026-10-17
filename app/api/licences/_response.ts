import { NextResponse } from "next/server";
import { LicenceError } from "@/lib/licences";
import { GoogleRequestError } from "@/lib/google-request";

export function licenceFailure(error: unknown) {
  if (error instanceof LicenceError) return NextResponse.json({ error: { code: error.code, message: error.message, fields: error.fields } }, { status: error.status });
  if (error instanceof GoogleRequestError) {
    console.error("[licences] Service Google indisponible", { code: error.code, status: error.status });
    return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
  }
  console.error("[licences] Erreur interne");
  return NextResponse.json({ error: { code: "SERVICE_INDISPONIBLE", message: "Service temporairement indisponible." } }, { status: 500 });
}
