// Stocké dans la colonne observations existante : aucune nouvelle colonne Sheets.
export const FORFEIT_MARKER = "[FEBACO:FORFAIT_30_0]";
export function isThirtyZeroForfeit(row: Record<string, string>) {
  return row.id_statut_resultat === "STR001" && String(row.observations ?? "").startsWith(FORFEIT_MARKER)
    && ((Number(row.score_total_a) === 30 && Number(row.score_total_b) === 0) || (Number(row.score_total_a) === 0 && Number(row.score_total_b) === 30));
}
