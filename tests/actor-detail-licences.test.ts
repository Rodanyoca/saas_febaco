import assert from "node:assert/strict"
import test from "node:test"
import { readFile } from "node:fs/promises"

test("les fiches coach et arbitre exposent leur onglet Licences", async () => {
  const [coach, arbitre] = await Promise.all([
    readFile("app/dashboard/coachs/[id]/page.tsx", "utf8"),
    readFile("app/dashboard/arbitres/[id]/page.tsx", "utf8"),
  ])
  assert.match(coach, /ActorLicensesPanel actorId=\{coach\.id\} typeId="TAC002"/)
  assert.match(arbitre, /ActorLicensesPanel actorId=\{arbitre\.id\} typeId="TAC004"/)
})

test("les fiches médecin et officiel exposent leur onglet Licences", async () => {
  const [medecin, officiel] = await Promise.all([
    readFile("app/dashboard/medecins/[id]/page.tsx", "utf8"),
    readFile("app/dashboard/officiels/[id]/page.tsx", "utf8"),
  ])
  assert.match(medecin, /ActorLicensesPanel actorId=\{medecin\.id\} typeId="TAC005"/)
  assert.match(officiel, /ActorLicensesPanel actorId=\{officiel\.id\} typeId="TAC003"/)
})

test("la fiche autre acteur ne propose aucune affiliation", async () => {
  const source = await readFile("app/dashboard/autres/[id]/page.tsx", "utf8")
  assert.doesNotMatch(source, /AffiliationsPanel|TabsTrigger value="affiliations"/)
})

test("l’interface arbitre utilise Grade et son référentiel", async () => {
  const [list, detail, editor, refs] = await Promise.all([
    readFile("app/dashboard/arbitres/page.tsx", "utf8"),
    readFile("app/dashboard/arbitres/[id]/page.tsx", "utf8"),
    readFile("components/dashboard/actor-editor.tsx", "utf8"),
    readFile("app/api/acteurs/referentiels/route.ts", "utf8"),
  ])
  assert.match(list, /header: "Grade"/)
  assert.match(detail, /label: "Grade", value: arbitre\.grade/)
  assert.match(editor, /"id_grade_arbitre","Grade","GRADES_ARBITRES"/)
  assert.match(refs, /"GRADES_ARBITRES"/)
})
