const state = globalThis as typeof globalThis & { __febacoDataQualityInvalidatedAt?: number }
export const dataQualityInvalidatedAt = () => state.__febacoDataQualityInvalidatedAt ?? 0
export const invalidateDataQualityRevision = () => { state.__febacoDataQualityInvalidatedAt = Date.now() }
