import assert from "node:assert/strict"
import test from "node:test"
import { evaluateBlock, hasMeaningfulValue, validDate } from "../lib/data-quality/engine"
import type { EntityCompletenessRule } from "../lib/data-quality/types"
import { QUALITY_RULES } from "../lib/data-quality/rules"
import { references } from "../lib/data-quality/service"

const rules:EntityCompletenessRule[]=[{entityType:"TEST",label:"Test",sheet:"TESTS",idAliases:["id"],labelAliases:["nom"],fields:[{key:"id",label:"ID",weight:3},{key:"nom",label:"Nom",weight:2},{key:"note",label:"Note",weight:1,isApplicable:r=>r.type!=="SANS_NOTE"}]}]
const context=(rows:Record<string,Record<string,string>[]>)=>({references:{},rows})

test("pondère les champs et agrège les points plutôt que les pourcentages",()=>{const rows={TESTS:[{id:"1",nom:"Alpha",note:"ok"},{id:"2",nom:"",note:"ok"}]};const result=evaluateBlock("actors","Test",rules,rows,context(rows));assert.equal(result.summary.score,83);assert.equal(result.summary.complete,1);assert.equal(result.summary.partial,1);assert.equal(result.summary.missingFields,1)})
test("exclut un champ non applicable du dénominateur",()=>{const rows={TESTS:[{id:"1",nom:"Alpha",note:"",type:"SANS_NOTE"}]};const result=evaluateBlock("actors","Test",rules,rows,context(rows));assert.equal(result.summary.score,100);assert.equal(result.summary.complete,1)})
test("retourne null pour un bloc vide",()=>{const rows={TESTS:[]};const result=evaluateBlock("actors","Test",rules,rows,context(rows));assert.equal(result.summary.score,null);assert.equal(result.summary.status,"NOT_EVALUATED")})
test("préserve zéro et false mais rejette les jetons vides",()=>{assert.equal(hasMeaningfulValue(0),true);assert.equal(hasMeaningfulValue(false),true);for(const value of ["", "-", "N/A", "null", "  "])assert.equal(hasMeaningfulValue(value),false)})
test("valide les dates civiles et rejette les dates artificielles",()=>{assert.equal(validDate("2026-02-28"),true);assert.equal(validDate("28/02/2026"),true);assert.equal(validDate("2026-02-31"),false);assert.equal(validDate("1900-01-01"),false)})

test("reconnaît les deux formats historiques des identifiants de province",()=>{
  const refs=references({PROVINCES:[{id_province:"PROV001"}]})
  assert.equal(refs.PROVINCES.has("PROV001"),true)
  assert.equal(refs.PROVINCES.has("PRO01"),true)
})

test("calcule réellement les structures et les affiliations/licences",()=>{
  const rows={PROVINCES:[{id_province:"PROV001"}],LIGUES:[{id_ligue:"01",nom_ligue:"Kinshasa",id_province:"PRO01",statut:"ACTIF"}],ENTENTES:[{id_entente:"EN1",nom_entente:"Entente",id_ligue:"01",statut:"ACTIF"}],CLUBS:[{id_club:"C1",nom_club:"Club",id_entente:"EN1",statut:"ACTIF"}],EQUIPES:[{id_equipe:"E1",id_club:"C1",id_categorie_age:"CAT1",id_sexe:"SEX001",statut:"ACTIF"}],ATHLETES:[{id_athlete:"ATH1"}],COACHS:[],MEDECINS:[],OFFICIELS:[],ARBITRES:[],ATHLETE_AFFILIATIONS:[{id_affiliation_athlete:"AFA-1",id_athlete:"ATH1",id_equipe:"E1",date_debut:"2026-01-01",id_statut_affiliation:"SAF001"}],COACH_AFFILIATIONS:[],MEDECINS_AFFILIATIONS:[],OFFICIELS_AFFILIATIONS:[],ATHLETE_LICENCES:[{id_licence:"LIC1",id_athlete:"ATH1",id_saison:"SAI1",id_affiliation_athlete:"AFA-1",numero_licence:"001",date_delivrance:"2026-01-02",id_statut_licence:"STL001"}],ACTEURS_LICENCES:[],SAISON:[{id_saison:"SAI1"}],STATUTS_AFFILIATION:[{id_statut_affiliation:"SAF001"}],STATUT_LICENCE:[{id_statut_licence:"STL001"}],CATEGORIES_AGE:[{id_categorie_age:"CAT1"}],SEXES:[{id_sexe:"SEX001"}]}
  const ctx={references:references(rows),rows,seasonId:"SAI1"}
  const structure=evaluateBlock("structure","Structures",QUALITY_RULES.structure,rows,ctx)
  const licences=evaluateBlock("licences","Licences",QUALITY_RULES.licences,rows,ctx)
  assert.equal(structure.summary.records,4)
  assert.equal(structure.summary.score,100)
  assert.equal(licences.summary.records,2)
  assert.equal(licences.summary.score,100)
})
