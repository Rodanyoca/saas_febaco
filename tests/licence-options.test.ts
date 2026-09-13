import assert from "node:assert/strict"
import test from "node:test"
import { sanitizeLicenceOptions } from "../lib/licence-options"

test("écarte les options vides et dupliquées qui font tomber Radix Select", () => {
  assert.deepEqual(sanitizeLicenceOptions([
    { id: "", label: "Vide" },
    { id: " SAI006 ", label: " 2026 " },
    { id: "SAI006", label: "Doublon" },
    { id: "STL001", label: "" },
  ]), [
    { id: "SAI006", label: "2026" },
    { id: "STL001", label: "STL001" },
  ])
})
