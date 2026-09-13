import assert from "node:assert/strict"
import test from "node:test"
import { formatDateField, formatDisplayDate, formatDatesInText, isDateDisplayField } from "../lib/date-format"

test("affiche les dates ISO au format JJ-MM-AAAA sans décalage de fuseau", () => {
  assert.equal(formatDisplayDate("2026-09-14"), "14-09-2026")
  assert.equal(formatDisplayDate("2026-09-14T23:00:00.000Z"), "14-09-2026")
  assert.equal(formatDisplayDate("4/2/2026"), "04-02-2026")
})

test("reconnaît les colonnes et libellés de date sans transformer les autres valeurs", () => {
  assert.equal(isDateDisplayField("dateNaissance", "Date de naissance"), true)
  assert.equal(isDateDisplayField("date_debut", "Début"), true)
  assert.equal(formatDateField("2026-09-14", "statut", "Statut"), "2026-09-14")
  assert.equal(formatDateField("2026-09-14", "dateMatch", "Date"), "14-09-2026")
  assert.equal(formatDatesInText("Match du 2026-09-14 à Kinshasa"), "Match du 14-09-2026 à Kinshasa")
})
