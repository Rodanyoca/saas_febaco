import assert from "node:assert/strict"
import test from "node:test"

import { mapWithConcurrency } from "../lib/dashboard/source-loader"

test("borne les appels simultanés du tableau de bord", async () => {
  let active = 0
  let maximum = 0
  const values = await mapWithConcurrency([1, 2, 3, 4, 5, 6], async (value) => {
    active += 1
    maximum = Math.max(maximum, active)
    await new Promise((resolve) => setTimeout(resolve, 5))
    active -= 1
    return value * 2
  }, 2)

  assert.deepEqual(values, [2, 4, 6, 8, 10, 12])
  assert.equal(maximum, 2)
})
