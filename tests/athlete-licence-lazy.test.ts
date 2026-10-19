import test from "node:test"
import assert from "node:assert/strict"
import { build } from "esbuild"
import { readFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { renderToStaticMarkup } from "react-dom/server"
import { createElement } from "react"

// DOM-free lifecycle harness: runs the component's real effects and real AbortController.
// It does not claim to replace an authenticated browser interaction test.
async function historyHarness() {
  let states: any[] = [], stateIndex = 0, effectIndex = 0
  let effects: Array<{ deps: unknown[]; cleanup?: () => void }> = [], pending: Array<() => void> = []
  const hooks = {
    useState(initial: any) { const i = stateIndex++; if (!(i in states)) states[i] = typeof initial === "function" ? initial() : initial; return [states[i], (next: any) => { states[i] = typeof next === "function" ? next(states[i]) : next }] },
    useEffect(create: () => (() => void), deps: unknown[]) { const i = effectIndex++, old = effects[i]; if (!old || deps.some((value, j) => !Object.is(value, old.deps[j]))) { const current = { deps, cleanup: undefined as (() => void) | undefined }; effects[i] = current; pending.push(() => { old?.cleanup?.(); current.cleanup = create() }) } },
  }
  ;(globalThis as any).__licenceP2Hooks = hooks
  const result = await build({ entryPoints: ["components/dashboard/athlete-licence-history.tsx"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "history-hooks", setup(b) {
    b.onResolve({ filter: /^react$/ }, args => args.importer.endsWith("athlete-licence-history.tsx") ? { path: "hooks", namespace: "hooks" } : undefined)
    b.onLoad({ filter: /.*/, namespace: "hooks" }, () => ({ contents: "export const useState=(...args)=>globalThis.__licenceP2Hooks.useState(...args);export const useEffect=(...args)=>globalThis.__licenceP2Hooks.useEffect(...args)", loader: "js" }))
  } }] })
  const mod = { exports: {} as { AthleteLicenceHistory: (props: { athleteId: string }) => any } }
  new Function("require", "module", "exports", result.outputFiles[0].text)(createRequire(process.cwd() + "/package.json"), mod, mod.exports)
  return {
    render(athleteId: string) { stateIndex = effectIndex = 0; return mod.exports.AthleteLicenceHistory({ athleteId }) },
    flush() { const work = pending; pending = []; work.forEach(run => run()) },
    unmount() { effects.forEach(effect => effect.cleanup?.()); states = []; effects = []; pending = [] },
    close() { this.unmount(); delete (globalThis as any).__licenceP2Hooks },
  }
}
const tick = () => new Promise<void>(resolve => setImmediate(resolve))
const licence = (numero: string) => ({ id: "LIC", saison: "2026", numero, structure: "Synthetic club", dateDelivrance: "2026-01-01", statut: "ACTIVE" })
function findRetry(node: any): (() => void) | undefined {
  if (!node || typeof node !== "object") return undefined
  if (node.props?.children === "Réessayer") return node.props.onClick
  return [node.props?.children].flat().map(findRetry).find(Boolean)
}

test("P2 client lifecycle: stable ID, fresh reopen, retry, abort and late responses cannot replace another athlete", async () => {
  const h = await historyHarness(), originalFetch = globalThis.fetch
  const calls: Array<{ url: string; signal: AbortSignal; resolve: (response: Response) => void }> = []
  globalThis.fetch = async (url, init) => new Promise<Response>(resolve => calls.push({ url: String(url), signal: init!.signal!, resolve }))
  try {
    assert.match(renderToStaticMarkup(h.render("A1")), /Chargement des licences/); h.flush()
    assert.equal(calls.length, 1); assert.equal(calls[0].url, "/api/athlete-licences?athleteId=A1")
    calls[0].resolve(Response.json({ licences: [licence("001")] })); await tick()
    assert.match(renderToStaticMarkup(h.render("A1")), /001/); h.flush(); assert.equal(calls.length, 1, "parent edit/photo rerender with same ID does not reload")
    h.unmount(); assert.equal(calls[0].signal.aborted, true)
    h.render("A1"); h.flush(); assert.equal(calls.length, 2, "reopen issues a new request")
    calls[1].resolve(Response.json({ error: "refused" }, { status: 403 })); await tick()
    const errorNode = h.render("A1"), errorHtml = renderToStaticMarkup(errorNode)
    assert.match(errorHtml, /role="alert"/); assert.doesNotMatch(errorHtml, /Aucune licence enregistrée|001/)
    findRetry(errorNode)!(); h.render("A1"); h.flush(); assert.equal(calls.length, 3)
    const beforeEffects = renderToStaticMarkup(h.render("A2")); assert.doesNotMatch(beforeEffects, /001/); h.flush()
    assert.equal(calls[2].signal.aborted, true); assert.equal(calls.length, 4)
    calls[3].resolve(Response.json({ licences: [licence("NEW-002")] })); await tick()
    calls[2].resolve(Response.json({ licences: [licence("STALE-001")] })); await tick()
    const current = renderToStaticMarkup(h.render("A2"))
    assert.match(current, /NEW-002/); assert.doesNotMatch(current, /STALE-001/)
    h.unmount(); h.render("A2"); h.flush(); calls[4].resolve(Response.json({ licences: [] })); await tick()
    assert.match(renderToStaticMarkup(h.render("A2")), /Aucune licence enregistrée/)
    h.unmount(); h.render("A2"); h.flush(); calls[5].resolve(Response.json({ unexpected: [] })); await tick()
    assert.match(renderToStaticMarkup(h.render("A2")), /role="alert"/)
  } finally { h.close(); globalThis.fetch = originalFetch }
});

test("P2 actual Radix Tabs mounting: no licence component before Licence; mounted only in selected tab", async () => {
  const page = "app/dashboard/athletes/[id]/page.tsx", source = await readFile(page, "utf8")
  assert.doesNotMatch(source, /api\/athlete-licences|forceMount/)
  assert.match(source, /<AthleteLicenceHistory key=\{athlete.id\} athleteId=\{athlete.id\}/)
  for (const tab of ["general", "affiliation", "licence"]) {
    let mounted = 0
    ;(globalThis as any).__p2HistoryMounted = () => { mounted++ }
    ;(globalThis as any).__p2PageState = { index: 0, values: [[{ id: "A1", nom: "Synthetic", prenom: "Test" }], false, null, false] }
    const result = await build({ entryPoints: [page], bundle: true, write: false, platform: "node", format: "cjs", packages: "external", plugins: [{ name: "actual-radix-SSR", setup(b) {
      b.onLoad({ filter: /[\\/]athletes[\\/]\[id\][\\/]page\.tsx$/ }, async args => ({ contents: (await readFile(args.path, "utf8")).replace('defaultValue="general"', `defaultValue="${tab}"`), loader: "tsx" }))
      b.onResolve({ filter: /^react$/ }, args => args.importer.endsWith("/page.tsx") || args.importer.endsWith("\\page.tsx") ? { path: "page", namespace: "page-hooks" } : undefined)
      b.onLoad({ filter: /.*/, namespace: "page-hooks" }, () => ({ contents: "export {useMemo,useEffect} from 'react';export const useState=()=>{const s=globalThis.__p2PageState;return [s.values[s.index++],()=>{}]}", loader: "js", resolveDir: process.cwd() }))
      b.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: "nav", namespace: "nav" }))
      b.onLoad({ filter: /.*/, namespace: "nav" }, () => ({ contents: "export const useParams=()=>({id:'A1'});export const useRouter=()=>({back(){}})", loader: "js" }))
      b.onResolve({ filter: /^@\/components\/dashboard\/(athlete-licence-history|header|actor-editor|avatar-upload-modal|affiliations-panel)$/ }, args => ({ path: args.path, namespace: "page-shell" }))
      b.onLoad({ filter: /.*/, namespace: "page-shell" }, () => ({ contents: "export const AthleteLicenceHistory=()=>{globalThis.__p2HistoryMounted();return null};export const Header=()=>null;export const ActorEditor=()=>null;export const AvatarUploadModal=()=>null;export const AffiliationsPanel=()=>null", loader: "js" }))
    } }] })
    const mod = { exports: {} as { default: () => ReturnType<typeof createElement> } }
    new Function("require", "module", "exports", result.outputFiles[0].text)(createRequire(process.cwd() + "/package.json"), mod, mod.exports)
    renderToStaticMarkup(createElement(mod.exports.default))
    assert.equal(mounted, tab === "licence" ? 1 : 0, tab)
  }
  delete (globalThis as any).__p2PageState; delete (globalThis as any).__p2HistoryMounted
});
