import { AsyncLocalStorage } from "node:async_hooks"
import { filterTerritorialRows, type ScopeIndex } from "./territorial-scope"
import type { User } from "../users/types"
type ReadPolicy={allowAdmin:boolean;authorization?:{user:User;readBlocks:string[]}}
const context=new AsyncLocalStorage<{territory:ScopeIndex|null}&ReadPolicy>()
export function withDataScope<T>(scope:ScopeIndex|null,work:()=>T,policy:ReadPolicy={allowAdmin:true}):T{return context.run({territory:scope,...policy},work)}
export function currentDataScope(){return context.getStore()?.territory}
export function currentAuthorizationSnapshot(){return context.getStore()?.authorization}
export function scopeReadRows<T extends Record<string,string>>(sheet:string,rows:T[]):T[]{const state=context.getStore();if(state&&!state.allowAdmin&&/^(?:ACTIVITES|DOCUMENTS)(?:_|$)/.test(sheet.toUpperCase()))return [];return state?.territory?filterTerritorialRows(sheet,rows,state.territory) as T[]:rows}
