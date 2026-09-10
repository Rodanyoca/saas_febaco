import test from "node:test"
import assert from "node:assert/strict"
import { getDataTableRowKey } from "../components/dashboard/data-table"

test("utilise un fallback unique quand l'idKey est absent", () => {
  const rows = [{ id: "ATH00001" }, { id: "ATH00002" }]
  const keys = rows.map((row, index) => getDataTableRowKey(row, "__key", index))

  assert.deepEqual(keys, [0, 1])
  assert.equal(new Set(keys).size, rows.length)
})
