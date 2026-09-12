import type { SheetRow } from "@/lib/google-sheets";

export type CompetitionEntityKind = "epreuve" | "phase" | "groupe" | "participation" | "intervenant" | "unite" | "affectation" | "phaseUnite" | "match" | "resultat" | "classement" | "distinction";

const codes: Record<CompetitionEntityKind, string> = {
  epreuve: "EPR", phase: "PHA", groupe: "GRP", participation: "PAR", intervenant: "INV", unite: "UNI",
  affectation: "AFG", phaseUnite: "PHU", match: "MAT", resultat: "RES", classement: "CLA", distinction: "DST",
};

const clean = (value: unknown) => String(value ?? "").trim();
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function competitionEntityId(
  kind: CompetitionEntityKind,
  competitionId: string,
  rows: SheetRow[],
  field: string,
): string {
  const context = clean(competitionId).toUpperCase().replace(/^BKB-COMP-/, "").replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "") || "COMP";
  const prefix = `BKB-${codes[kind]}-${context}-`;
  const matcher = new RegExp(`^${escapeRegExp(prefix)}(\\d+)$`, "i");
  const next = Math.max(0, ...rows.map((row) => clean(row[field]).match(matcher)).filter(Boolean).map((match) => Number(match![1])).filter(Number.isFinite)) + 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}
