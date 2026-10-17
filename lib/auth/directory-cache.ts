import type { User, UserAuthorization } from "../users/types"

export type Directory = { byId: Map<string, User>; byEmail: Map<string, User>; grants: Map<string, UserAuthorization[]> }
// No stale fallback. Failed refreshes cannot extend access indefinitely.
export class DirectoryCache {
  private value?: { data: Directory; until: number }
  private pending?: Promise<Directory>
  private generation = 0
  constructor(private load: () => Promise<Directory>, private ttlMs = 10_000, private now = Date.now) {}
  invalidate() { this.generation++; this.value = undefined; this.pending = undefined }
  async get(fresh = false): Promise<Directory> {
    if (!fresh && this.value && this.value.until > this.now()) return this.value.data
    if (!fresh && this.pending) return this.pending
    const generation = this.generation, started = this.now()
    const request = this.load().then(data => {
      if(generation!==this.generation || this.now()>=started+this.ttlMs)throw new Error("Snapshot de droits expiré pendant la lecture.")
      if (generation === this.generation) this.value = { data, until: started + this.ttlMs }
      return data
    }).finally(() => { if (this.pending === request) this.pending = undefined })
    this.pending = request
    return request
  }
}
