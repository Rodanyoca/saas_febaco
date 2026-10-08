import assert from "node:assert/strict"
import test from "node:test"
import { readFile } from "node:fs/promises"

test("lit PROVINCES depuis le référentiel sans faire tomber le lot Structures",async()=>{
  const source=await readFile("lib/data-quality/service.ts","utf8")
  assert.doesNotMatch(source,/block:\s*"structure",\s*sheets:\s*\["PROVINCES"/)
  assert.match(source,/block:\s*"referentiel",\s*sheets:\s*\[[^\]]*"PROVINCES"/)
})

test("une panne Structures ne masque pas les licences et affiliations",async()=>{
  const source=await readFile("lib/data-quality/service.ts","utf8")
  assert.doesNotMatch(source,/structure:\s*\["structure",\s*"licences"\]/)
})
