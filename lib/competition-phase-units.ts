import type { SheetRow } from "@/lib/google-sheets";

const clean = (value: unknown) => String(value ?? "").trim();

export type ResolvedPhaseUnitRow = SheetRow & {
  id_phase_unite: string;
  id_phase_competition: string;
  id_groupe: string;
  id_unite_competition: string;
};

export function mergeCompetitionPhaseUnits(canonical: SheetRow[], historical: SheetRow[], groups: SheetRow[]): ResolvedPhaseUnitRow[] {
  const phaseByGroup = new Map(groups.map((row) => [clean(row.id_groupe), clean(row.id_phase_competition)]));
  const output = new Map<string, ResolvedPhaseUnitRow>();
  const add = (row: SheetRow, historicalRow: boolean) => {
    const groupId = clean(row.id_groupe), phaseId = historicalRow ? phaseByGroup.get(groupId) || "" : clean(row.id_phase_competition), unitId = clean(row.id_unite_competition);
    if (!phaseId || !unitId) return;
    const key = `${phaseId}\u0000${unitId}\u0000${groupId}`;
    if (output.has(key)) return;
    output.set(key, { ...row, id_phase_unite: clean(row.id_phase_unite) || clean(row.id_affectation_groupe), id_phase_competition: phaseId, id_groupe: groupId, id_unite_competition: unitId });
  };
  canonical.forEach((row) => add(row, false));
  historical.forEach((row) => add(row, true));
  return [...output.values()];
}
