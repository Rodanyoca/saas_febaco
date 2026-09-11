import test from "node:test"
import assert from "node:assert/strict"
import { buildClubLogoFileName } from "../lib/google-drive"

test("génère un nom de logo stable à partir de l'identifiant du club", () => {
  assert.equal(buildClubLogoFileName("21", "PNG"), "LOGO_CLUB_21.png")
  assert.equal(buildClubLogoFileName("club / test", ".webp"), "LOGO_CLUB_CLUB___TEST.webp")
})

test("refuse un nom de logo sans identifiant de club", () => {
  assert.throws(() => buildClubLogoFileName("", "png"), /Identifiant club invalide/)
})
