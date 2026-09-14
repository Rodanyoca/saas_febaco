import assert from "node:assert/strict"
import test from "node:test"
import { readFile } from "node:fs/promises"

test("la navigation expose une seule entrée canonique Équipes nationales", async()=>{
 const source=await readFile("components/dashboard/sidebar.tsx","utf8")
 const block=source.match(/const navigationEquipeNationale[\s\S]*?\n\]/)?.[0]||""
 assert.equal((block.match(/name: "Équipes nationales"/g)||[]).length,1)
 assert.match(block,/href: "\/equipes-nationales"/)
 assert.doesNotMatch(block,/href: "\/dashboard\/equipe-nationale/)
})

test("les anciennes pages redirigent vers la page canonique", async()=>{
 for(const path of ["app/dashboard/equipe-nationale/page.tsx","app/dashboard/equipe-nationale/competitions/page.tsx","app/dashboard/equipe-nationale/resultats/page.tsx"])
  assert.match(await readFile(path,"utf8"),/redirect\("\/equipes-nationales"\)/)
})

test("le tableau de bord ne charge plus les anciennes routes nationales", async()=>{
 const source=await readFile("app/dashboard/page.tsx","utf8")
 assert.doesNotMatch(source,/\/api\/equipe-nationale(?:-|\")/)
 assert.match(source,/\/api\/equipes-nationales/)
})
