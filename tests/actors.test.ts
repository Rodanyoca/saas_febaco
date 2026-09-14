import test from "node:test"
import assert from "node:assert/strict"
import { ActorError, actorConfig, generateActorId, mutateActor, normalizeActor, normalizeSexId, sortActorsAlphabetically, validateActorInput, type ActorKind } from "../lib/actors"
import type { SheetRow } from "../lib/google-sheets"

const kinds:ActorKind[]=["athletes","coachs","officiels","arbitres","medecins","autres"]
const canonicalHeaders=["id_national","id_international","nom_complet","id_sexe","date_de_naissance","lieu_de_naissance","nationalite","telephone","email","adresse","numero_passeport","date_de_delivrance_passeport","date_expiration_passeport","statut","avatar_drive_id","avatar_drive_url","passeport_drive_id","passeport_drive_url"]
function depsFor(kind:ActorKind,initial:SheetRow[]=[],emptySpecialities=false){
  let rows=[...initial],writes=0
  return {deps:{
    readRows:async (params:string|{sheet:string})=>{const sheet=typeof params==="string"?params:params.sheet;if(sheet==="SEXES")return [{id_sexe:"SEX001"},{id_sexe:"SEX002"},{id_sexe:"SEX099"}];if(sheet==="SPECIALITES_MEDECINS")return emptySpecialities?[]:[{id_specialite:"SPE001"}];if(sheet==="TYPES_AUTRES_ACTEURS")return [{id_type_autre_acteur:"TAU001"}];return rows},
    writeRow:async ({id,values,mode}:{id:string;values:Record<string,string>;mode:"create"|"update"})=>{writes++;const idKey=actorConfig[kind].id;const next:{[key:string]:string}={...values,[idKey]:id};if(mode==="update")rows=rows.map(r=>r[idKey]===id?{...r,...next}:r);else rows.push(next);return next},
  } as never,get writes(){return writes}}
}
const payload=(kind:ActorKind)=>({nom_complet:"Marie Test",id_sexe:"SEX002",statut:"ACTIF",...(kind==="medecins"?{id_specialite_sante:"SPE001"}:{}),...(kind==="autres"?{id_type_autre_acteur:"TAU001"}:{})})

for(const kind of kinds)test(`crée et modifie un acteur ${kind} avec un seul write par commande`,async()=>{const fake=depsFor(kind);const created=await mutateActor(kind,"create",payload(kind),undefined,fake.deps);assert.ok(created.id);assert.equal(fake.writes,1);const updated=await mutateActor(kind,"update",{...payload(kind),nom_complet:"Marie Modifiée"},created.id,fake.deps);assert.equal(updated.id,created.id);assert.equal(updated.nom_complet,"Marie Modifiée");assert.equal(fake.writes,2)})

test("normalise les valeurs historiques du sexe",()=>{assert.equal(normalizeSexId("MASCULINE"),"SEX001");assert.equal(normalizeSexId("F"),"SEX002");assert.equal(normalizeSexId("AUTRE"),"SEX099")})
test("résout le niveau du coach depuis le référentiel",()=>{const coach=normalizeActor("coachs",{id_coach:"COA-1",nom_complet:"Coach Test",id_niveau:"NCO002"},{coachLevels:[{id_niveau_coach:"NCO002",nom_niveau_coach:"LEVEL 2"}]});assert.equal(coach.id_niveau,"NCO002");assert.equal(coach.niveau,"LEVEL 2")})
test("résout le grade de l’arbitre depuis le référentiel",()=>{const arbitre=normalizeActor("arbitres",{id_arbitre:"ARB-1",nom_complet:"Arbitre Test",id_grade_arbitre:"GAR002"},{refereeGrades:[{id_grade_arbitre:"GAR002",nom_grade_arbitre:"International"}]});assert.equal(arbitre.id_grade_arbitre,"GAR002");assert.equal(arbitre.grade,"International")})
test("refuse un sexe invalide",()=>assert.ok(validateActorInput("athletes",{nom_complet:"A",id_sexe:"X",statut:"ACTIF"}).errors.id_sexe))
test("refuse une naissance future",()=>assert.ok(validateActorInput("athletes",{nom_complet:"A",id_sexe:"SEX001",statut:"ACTIF",date_de_naissance:"2999-01-01"}).errors.date_de_naissance))
test("refuse des dates de passeport incohérentes",()=>assert.ok(validateActorInput("athletes",{nom_complet:"A",id_sexe:"SEX001",statut:"ACTIF",date_de_delivrance_passeport:"2026-02-01",date_expiration_passeport:"2026-01-01"}).errors.date_expiration_passeport))
test("accepte l'absence des données facultatives",()=>assert.deepEqual(validateActorInput("athletes",{nom_complet:"A",id_sexe:"SEX001",statut:"ACTIF"}).errors,{}))
test("génère l'identifiant selon la convention déjà présente",()=>{assert.equal(generateActorId("coachs",[{id_coach:"1"},{id_coach:"9"}]),"10");assert.equal(generateActorId("arbitres",[{id_arbitre:"REF00001"}]),"REF00002")})
test("refuse les identifiants national et international dupliqués",async()=>{const row={id_athlete:"ATH00001",id_national:"N1",id_fiba:"I1",...Object.fromEntries(canonicalHeaders.map(k=>[k,""]))};row.id_national="N1";row.id_fiba="I1";const fake=depsFor("athletes",[row]);await assert.rejects(()=>mutateActor("athletes","create",{...payload("athletes"),id_national:"N1"},undefined,fake.deps),(e:unknown)=>e instanceof ActorError&&e.code==="IDENTIFIANT_DUPLIQUE")})
test("signale le référentiel médecin vide",async()=>{const fake=depsFor("medecins",[],true);await assert.rejects(()=>mutateActor("medecins","create",payload("medecins"),undefined,fake.deps),(e:unknown)=>e instanceof ActorError&&e.code==="REFERENTIEL_VIDE")})
test("ignore tout identifiant fourni et garde l'identifiant de route en modification",async()=>{const fake=depsFor("athletes",[{id_athlete:"ATH00007",nom_complet:"Avant",id_sexe:"SEX001",statut:"ACTIF"}]);const updated=await mutateActor("athletes","update",{...payload("athletes"),id_athlete:"PIRATE"},"ATH00007",fake.deps);assert.equal(updated.id,"ATH00007")})
test("le formulaire verrouille les doubles soumissions et conserve les erreurs",async()=>{const source=await import("node:fs/promises").then(fs=>fs.readFile("components/dashboard/actor-editor.tsx","utf8"));assert.match(source,/submitting\.current/);assert.match(source,/setErrors\(\{\.\.\.j\?\.error\?\.fields/);assert.doesNotMatch(source,/setOpen\(false\).*!r\.ok/)})
test("les routes d'écriture exigent une session fédérale",async()=>{const source=await import("node:fs/promises").then(fs=>fs.readFile("app/api/_actor-write.ts","utf8"));assert.match(source,/if\(!user\).*401/);assert.match(source,/user\.role!=="federal"/);assert.match(source,/status:403/)})
test("transforme une panne Sheets en erreur structurée",async()=>{const fake=depsFor("athletes");const deps={...(fake.deps as object),writeRow:async()=>{throw new Error("provider down")}} as never;await assert.rejects(()=>mutateActor("athletes","create",payload("athletes"),undefined,deps),(e:unknown)=>e instanceof ActorError&&e.code==="SERVICE_INDISPONIBLE"&&e.status===503)})
test("classe les acteurs par nom complet selon l’ordre alphabétique français",()=>{
  const sorted=sortActorsAlphabetically([
    {id:"3",nom_complet:"Élodie Zola"},
    {id:"1",nom_complet:"Alain Tshibangu"},
    {id:"2",nom_complet:"béatrice Mbala"},
  ])
  assert.deepEqual(sorted.map(actor=>actor.id),["1","2","3"])
})
