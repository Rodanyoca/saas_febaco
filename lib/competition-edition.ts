import type { SheetRow } from "@/lib/google-sheets";
import { CompetitionParticipationError } from "@/lib/competition-participants";

export function requireCompetitionEdition(rows: SheetRow[], competitionId: string) {
  const row = rows.find(item => String(item.id_competition ?? "").trim() === competitionId);
  if (!row) throw new CompetitionParticipationError("COMPETITION_INTROUVABLE", "L’édition n’existe pas.", 404);
  return row;
}
