import assert from "node:assert/strict"
import test from "node:test"
import { actorCompletionSummary, actorMissingFields } from "../lib/dashboard/calculations"

const complete={nomComplet:"Amina Ilunga",dateNaissance:"2001-04-12",sexe:"F",email:"amina@example.cd",telephone:"+243900000000"}

test("la complétude d'un acteur repose uniquement sur les cinq informations validées",()=>{
 assert.deepEqual(actorCompletionSummary([complete,{...complete,email:""}]),{total:2,complete:1,incomplete:1,rate:50})
 assert.equal(actorCompletionSummary([{...complete,statut:"",nationalite:"",niveau:""}]).complete,1)
})

test("les données manquantes des acteurs utilisent les mêmes critères",()=>{
 const rows=actorMissingFields([{...complete,dateNaissance:"",telephone:""}],"Athlètes")
 assert.deepEqual(rows.map(row=>row.field),["Date de naissance","Téléphone"])
})
