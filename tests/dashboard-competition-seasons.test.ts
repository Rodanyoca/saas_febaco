import assert from "node:assert/strict"
import test from "node:test"
import { competitionSeasonSummary } from "../lib/dashboard/competition-seasons"

test("counts competitions and valid participations by season for the last three years", () => {
  const rows = competitionSeasonSummary(
    [{ id_competition: "C1", id_saison: "S1", date_debut: "2025-12-01" }, { id_competition: "C2", date_debut: "2024-04-01" }, { id_competition: "C3", date_debut: "2023-01-01" }],
    [{ id_competition: "C1" }, { id_competition: "C1", statut_participation: "SUPPRIMEE" }, { id_competition: "C2" }, { id_competition: "C3" }, { id_competition: "unknown" }],
    [{ id_saison: "S1", nom_saison: "2026" }], 2026,
  )
  assert.deepEqual(rows, [
    { label: "2026", competitions: 1, participants: 1 },
    { label: "2025", competitions: 0, participants: 0 },
    { label: "2024", competitions: 1, participants: 1 },
  ])
})
