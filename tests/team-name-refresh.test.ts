import assert from "node:assert/strict"
import test from "node:test"
import { readFile } from "node:fs/promises"

test("les fiches Ligue et Club relisent les noms d'équipes modifiés dans Sheets", async () => {
  const [league, club, route] = await Promise.all([
    readFile("app/dashboard/ligues/[id]/page.tsx", "utf8"),
    readFile("app/dashboard/clubs/[id]/page.tsx", "utf8"),
    readFile("app/api/equipes/route.ts", "utf8"),
  ])
  assert.match(league, /\/api\/equipes\?fresh=1/)
  assert.match(club, /\/api\/equipes\?fresh=1/)
  assert.match(route, /searchParams\.get\("fresh"\) === "1"/)
})
