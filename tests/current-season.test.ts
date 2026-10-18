import test from "node:test"
import assert from "node:assert/strict"
import { CURRENT_SEASON_KEY, SeasonSettingsError, compareLicenceNumbers, currentSeasonLicenceIndex, missingSeasonLicence, resolveSeasonSettings, validateSeasonChange } from "../lib/current-season-domain"
import { routePolicy } from "../lib/auth/route-policy"
import { authorize } from "../lib/auth/authorization"

const seasons = [{ id_saison: "S1", nom_saison: "Historique" }, { id_saison: "S2", nom_saison: "Suivante" }]
const parameters = (id: string) => [{ cle_parametre: CURRENT_SEASON_KEY, valeur_parametre: id }]
const licence = (athlete: string, season: string, number: string, status = "STL001") => ({ id_athlete: athlete, id_saison: season, numero_licence: number, id_statut_licence: status })

test("saison explicite uniquement : aucune déduction par libellé, ordre ou année", () => {
  const settings = resolveSeasonSettings(seasons, parameters(""))
  assert.equal(settings.currentSeason, null)
  assert.equal(settings.currentSeasonId, "")
  assert.equal(resolveSeasonSettings(seasons, parameters("S1")).currentSeason?.id, "S1")
  assert.throws(() => resolveSeasonSettings(seasons, []), SeasonSettingsError)
  assert.throws(() => resolveSeasonSettings(seasons, [...parameters("S1"), ...parameters("S2")]), SeasonSettingsError)
  assert.throws(() => resolveSeasonSettings(seasons, parameters("UNKNOWN")), SeasonSettingsError)
  assert.throws(() => resolveSeasonSettings([...seasons, seasons[0]], parameters("S1")), SeasonSettingsError)
})

test("une saison active ne devient pas courante ; une saison annulée est refusée", () => {
  const rows = [{ id_saison: "S1", nom_saison: "Une", id_statut_saison: "ACTIVE" }, { id_saison: "S2", nom_saison: "Deux", id_statut_saison: "CANCEL" }]
  const statuses = [{ id_statut_saison: "ACTIVE", nom_statut: "ACTIVE" }, { id_statut_saison: "CANCEL", nom_statut: "ANNULEE" }]
  const settings = resolveSeasonSettings(rows, parameters(""), statuses)
  assert.equal(settings.currentSeason, null)
  assert.equal(validateSeasonChange(settings, "S1").id, "S1")
  assert.throws(() => validateSeasonChange(settings, "S2"), SeasonSettingsError)
  assert.throws(() => validateSeasonChange(settings, "UNKNOWN"), SeasonSettingsError)
  assert.throws(() => validateSeasonChange(settings, null), SeasonSettingsError)
})

test("licences de la saison configurée : aucun repli historique ni numéro système", () => {
  const rows = [licence("A1", "S1", "00123"), licence("A1", "S2", "00999"), licence("A2", "S2", "777"), licence("A3", "S1", "456", "STL003")]
  const current = currentSeasonLicenceIndex(rows, "S1")
  assert.equal(current.get("A1")?.licenceNumero, "00123")
  assert.equal(current.get("A2"), undefined)
  assert.equal(missingSeasonLicence.licenceDisplay, "")
  assert.equal(current.get("A3")?.licenceState, "INACTIVE")
  assert.equal(current.get("A3")?.licenceNumero, "")
  assert.equal(currentSeasonLicenceIndex(rows, "").size, 0)
  for (const status of ["STL002", "STL003", "STL004", "STL005", "STL099", ""]) assert.equal(currentSeasonLicenceIndex([licence("A", "S1", "123", status)], "S1").get("A")?.licenceNumero, "")
})

test("les doublons athlète-saison sont signalés sans choix arbitraire", () => {
  const result = currentSeasonLicenceIndex([licence("A1", "S1", "123"), licence("A1", "S1", "456")], "S1").get("A1")
  assert.equal(result?.licenceState, "AMBIGUOUS")
  assert.equal(result?.licenceNumero, "")
})

test("le changement de saison reconstruit les correspondances sans conserver l’ancienne licence", () => {
  const rows = [licence("A1", "S1", "123"), licence("A1", "S2", "456")]
  const first = resolveSeasonSettings(seasons, parameters("S1"))
  const second = resolveSeasonSettings(seasons, parameters("S2"))
  assert.equal(currentSeasonLicenceIndex(rows, first.currentSeasonId).get("A1")?.licenceNumero, "123")
  assert.equal(currentSeasonLicenceIndex(rows, second.currentSeasonId).get("A1")?.licenceNumero, "456")
})

test("tri des numéros affichés, zéros conservés et absences placées en dernier", () => {
  const rows = [{ id: "Z", licenceNumero: "010" }, { id: "A", licenceNumero: "2" }, { id: "B", licenceNumero: "" }]
  assert.deepEqual([...rows].sort(compareLicenceNumbers).map(row => row.id), ["A", "Z", "B"])
  assert.deepEqual([...rows].sort((a, b) => compareLicenceNumbers(a, b, "desc")).map(row => row.id), ["Z", "A", "B"])
})

test("les paramètres réutilisent SUPER_ADMIN, sans élargir les droits ADMIN fédéraux", () => {
  for (const path of ["/dashboard/parametres", "/api/parametres"]) {
    const requirement = routePolicy(path)!
    assert.deepEqual(requirement, { scope: "SUPER_ADMIN" })
    for (const action of ["READ", "WRITE"] as const) {
      assert.equal(authorize({ user: { idUser: "U", typeUser: "ADMIN", estSuperAdmin: false }, authorizations: [], requirement, action }).allowed, false)
      assert.equal(authorize({ user: { idUser: "U", typeUser: "ADMIN", estSuperAdmin: true }, authorizations: [], requirement, action }).allowed, true)
    }
  }
})
