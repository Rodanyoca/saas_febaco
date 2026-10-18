import { build } from "esbuild"
import { createRequire } from "node:module"
import { resolve } from "node:path"
import { readFile } from "node:fs/promises"
import { randomUUID } from "node:crypto"
import { createSessionToken } from "../../lib/auth/session-token"
import { buildScopeIndex } from "../../lib/auth/territorial-scope"
import { pickFirst, sheetValuesToRows } from "../../lib/google-sheets"
import type { User } from "../../lib/users/types"

export function syntheticAthleteValues(count: number): string[][] {
  const headers = ["id_athlete", "nom_complet", "id_sexe", "date_naissance", "id_national", "id_fiba", "nationalite", "telephone", "email", "adresse", "statut", "observations", "avatar_drive_url", "lieu_naissance", "numero_passeport", "date_delivrance_passeport", "date_expiration_passeport", "avatar_drive_id", "passeport_drive_id", "passeport_drive_url"]
  const names = ["Élodie", "Anne-Marie", "Anne Marie", "O’Neil", "Zola", "Béatrice", "", "elodie", "E\u0301lodie", "ONeil"]
  return [headers, ...Array.from({ length: count }, (_, index) => [
    `ATH${String(index).padStart(5, "0")}`, index % 97 ? `${names[index % names.length]} ${String((index * 7919) % count).padStart(5, "0")}` : "",
    index % 2 ? "SEX001" : "SEX002", index % 13 ? "2001-02-03" : "", `SYNTH-${index}`, "", "SYNTHETIC", "", "", "", "ACTIF", "Synthetic fixture only", "", "", "", "", "", "", "", "",
  ])]
}

export async function createAthleteDetailFixture(before: boolean, values = syntheticAthleteValues(8), instrument = true) {
  const globalKey = `__athleteDetail_${randomUUID().replace(/-/g, "")}`
  const secret = "synthetic-fixture-signing-key-not-a-real-secret", now = 1800000000
  const user: User = { idUser: "U", nomComplet: "Synthetic", email: "u@example.invalid", passwordHash: "unused", typeUser: "ADMIN", estSuperAdmin: false, doitChangerMotDePasse: false, statut: "ACTIF", dateCreation: "2026-01-01T00:00:00Z", dateModificationMotDePasse: null, derniereConnexion: null, sessionVersion: 1, dateExpirationAccesTemporaire: null }
  const token = await createSessionToken({ idUser: "U", sessionVersion: 1, secret, nowSeconds: now })
  const grant = { idUserAutorisation: "G", idUser: "U", idBlocAutorisation: "AUT-SPT", statut: "ACTIF", dateDebut: "2000-01-01", dateFin: null }
  const state = {
    user: user as User | null, token, secret, now, grants: [grant], authUnavailable: false,
    scope: null as ReturnType<typeof buildScopeIndex> | null, failSheet: "", values,
    normalizations: 0, categoryCalls: 0, comparisons: 0, sortCalls: 0, configurationReads: 0, convertedRows: 0,
    sheetReads: [] as string[], pickFirst, sheetValuesToRows,
  }
  const globals = globalThis as unknown as Record<string, unknown>
  globals[globalKey] = state
  const fixture = `globalThis[${JSON.stringify(globalKey)}]`
  const contextPath = resolve("lib/auth/data-context.ts")
  const sessionResolution = resolve("lib/auth/session-resolution.ts")
  const sessionSource = `
    import {resolveSession} from ${JSON.stringify(sessionResolution)};
    export async function getResolvedSession(){const s=${fixture};if(s.authUnavailable)throw Error('offline');const r=await resolveSession({token:s.token,secret:s.secret,nowSeconds:s.now,loadUser:async()=>s.user});return r.ok?r:null}
    export async function getSessionUser(){const r=await getResolvedSession();return r?.user||null}
  `
  const virtual: Record<string, string> = {
    "../auth-session": sessionSource,
    "@/lib/auth-session": sessionSource,
    "../users/data": `export async function getAuthorizationsForUser(){return ${fixture}.grants}`,
    "../users/google-adapter": "export function createGoogleUsersSheetsAdapter(){return {}}",
    "./scope-source": `export async function loadScopeIndex(){return ${fixture}.scope}`,
    "../audit/logger": "export async function writeAudit(){throw Error('No writes in GET fixture')}",
    "@/app/api/_actor-write": "export async function handleActorWrite(){throw Error('No writes in GET fixture')}",
    "@/lib/current-season": `export async function loadSeasonSettings(){${fixture}.configurationReads++;return {currentSeasonId:'S1',currentSeason:{id:'S1',label:'Synthetic season',status:'ACTIVE',disabled:false}}}`,
    "@/lib/google-sheets": `
      import {scopeReadRows} from ${JSON.stringify(contextPath)};
      export function pickFirst(row,keys){return ${fixture}.pickFirst(row,keys)}
      export async function readSheetRows({sheet}){
        const s=${fixture};s.sheetReads.push(sheet);if(s.failSheet===sheet)throw Error('synthetic source failure');
        const values=sheet==='ATHLETES'?s.values:sheet==='CATEGORIES_AGE'?[['id_categorie_age','nom_categorie_age','age_min','age_max'],['AGE1','Synthetic category','0','99']]:[];
        const rows=s.sheetValuesToRows(values);if(sheet==='ATHLETES')s.convertedRows+=rows.length;
        return scopeReadRows(sheet,rows)
      }
      export async function writeSheetRowByHeaders(){throw Error('No writes in GET fixture')}
    `,
  }
  const route = before ? "tests/fixtures/athlete-detail-before.ts" : "app/api/athletes/route.ts"
  try {
    const result = await build({ entryPoints: [route], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "athlete-detail-fixture", setup(builder) {
      builder.onResolve({ filter: /.*/ }, args => args.path in virtual ? { path: args.path, namespace: "fixture" } : undefined)
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: virtual[args.path], loader: "js", resolveDir: process.cwd() }))
      builder.onLoad({ filter: /[\\/]lib[\\/]actors\.ts$/ }, async args => {
        let contents = await readFile(args.path, "utf8")
        if (!instrument) return { contents, loader: "ts" }
        const listMap = ".map(r=>normalizeActor(kind,r,{coachLevels,refereeGrades}))"
        if (!contents.includes(listMap)) throw Error("Reference normalization seam changed")
        contents = contents.replace(listMap, `.map(r=>{${fixture}.normalizations++;return normalizeActor(kind,r,{coachLevels,refereeGrades})})`)
        contents = contents.replace('.map(row => normalizeActor("athletes", row))', `.map(row => {${fixture}.normalizations++;return normalizeActor("athletes", row)})`)
        return { contents, loader: "ts" }
      })
      builder.onLoad({ filter: /[\\/]lib[\\/]athlete-sort\.ts$/ }, async args => {
        if (!instrument) return { contents: await readFile(args.path, "utf8"), loader: "ts" }
        const contents = (await readFile(args.path, "utf8"))
          .replace("return [...athletes].sort", `${fixture}.sortCalls++;return [...athletes].sort`)
          .replace("nameCollator.compare(a.nom_complet, b.nom_complet)", `(${fixture}.comparisons++,nameCollator.compare(a.nom_complet, b.nom_complet))`)
        return { contents, loader: "ts" }
      })
      builder.onLoad({ filter: /[\\/]lib[\\/]athlete-age-category\.ts$/ }, async args => {
        if (!instrument) return { contents: await readFile(args.path, "utf8"), loader: "ts" }
        const contents = (await readFile(args.path, "utf8")).replace("  const age = athleteAge(value, asOf)", `  ${fixture}.categoryCalls++;const age = athleteAge(value, asOf)`)
        return { contents, loader: "ts" }
      })
    } }] })
    const mod = { exports: {} as { GET: (request: Request) => Promise<Response> } }
    new Function("require", "module", "exports", result.outputFiles[0].text)(createRequire(resolve("package.json")), mod, mod.exports)
    return {
      state, user, grant,
      request: (query: string) => mod.exports.GET(new Request(`https://febaco.invalid/api/athletes${query}`)),
      resetCounts() { state.normalizations = 0; state.categoryCalls = 0; state.comparisons = 0; state.sortCalls = 0; state.configurationReads = 0; state.convertedRows = 0; state.sheetReads = [] },
      close() { delete globals[globalKey] },
    }
  } catch (error) { delete globals[globalKey]; throw error }
}
