import assert from "node:assert/strict"
import test from "node:test"
import { searchLicenceOptions, sanitizeLicenceOptions } from "../lib/licence-options"

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

test("borne les résultats de recherche afin de ne jamais monter tout le référentiel dans le DOM", () => {
  const options = Array.from({ length: 500 }, (_, index) => ({
    id: `ATH${String(index).padStart(5, "0")}`,
    label: `Athlète ${index}`,
  }))

  assert.deepEqual(searchLicenceOptions(options, "a"), [])
  assert.equal(searchLicenceOptions(options, "athlete", 40).length, 40)
  assert.deepEqual(searchLicenceOptions(options, "ATH00499"), [
    { id: "ATH00499", label: "Athlète 499" },
  ])
})
