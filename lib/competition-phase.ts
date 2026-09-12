import type { SheetRow } from "@/lib/google-sheets";

export const GROUP_PHASE_MODE_ID = "MPH001";
export const KNOCKOUT_PHASE_MODE_ID = "MPH002";
export const OTHER_PHASE_MODE_ID = "MPH099";

const clean = (value: unknown) => String(value ?? "").trim();
export function resolveCompetitionPhaseTypeId(phase: SheetRow): string {
  return clean(phase.id_type_phase);
}

export function resolveCompetitionPhaseModeId(phase: SheetRow): string {
  return clean(phase.id_mode_phase);
}

export function isCompetitionGroupPhase(phase: SheetRow): boolean {
  return resolveCompetitionPhaseModeId(phase) === GROUP_PHASE_MODE_ID;
}

export function resolvedReferenceLabel(id: string, rows: SheetRow[], idKey: string, labelKey: string, fallback: string): string {
  return clean(rows.find((row) => clean(row[idKey]) === id)?.[labelKey]) || fallback;
}
