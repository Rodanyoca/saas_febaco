import assert from "node:assert/strict"
import test from "node:test"
import { readFile } from "node:fs/promises"

test("le tableau de bord inclut le module national dans son unique appel agrégé",async()=>{
 const source=await readFile("app/dashboard/page.tsx","utf8")
 assert.equal((source.match(/fetch\("\/api\/dashboard"/g)||[]).length,1)
 assert.equal((source.match(/fetch\(/g)||[]).length,1)
})

test("le module national groupe les lectures par classeur et tolère les données sportives secondaires",async()=>{
 const source=await readFile("lib/national-teams.ts","utf8")
 assert.match(source,/readSheetRowsBatch/)
 assert.match(source,/batch\("competitions",[\s\S]*?,true\)/)
 assert.doesNotMatch(source,/Promise\.all\(\[loadCore\(\),refs\(/)
})
