import test from "node:test"
import assert from "node:assert/strict"
import { buildClubLogoFileName } from "../lib/google-drive"
import { buildDrivePublicUrl } from "../lib/google-drive-url"
import { clubLogoErrorMessage } from "../app/api/upload/club-logo/route"

test("génère un nom de logo stable à partir de l'identifiant du club", () => {
  assert.equal(buildClubLogoFileName("21", "PNG"), "LOGO_CLUB_21.png")
  assert.equal(buildClubLogoFileName("club / test", ".webp"), "LOGO_CLUB_CLUB___TEST.webp")
})

test("refuse un nom de logo sans identifiant de club", () => {
  assert.throws(() => buildClubLogoFileName("", "png"), /Identifiant club invalide/)
})

test("sert les logos par le proxy authentifié sans partage public Drive", () => {
  assert.equal(buildDrivePublicUrl("drive-file-123"), "/api/media/drive?id=drive-file-123")
})

test("explique une configuration Drive manquante sans exposer de secret", () => {
  assert.equal(
    clubLogoErrorMessage(new Error("Missing environment variable: GOOGLE_DRIVE_CLUB_LOGO_FOLDER_ID")),
    "Configuration serveur incomplète : GOOGLE_DRIVE_CLUB_LOGO_FOLDER_ID.",
  )
})
