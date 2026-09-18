import { storageConfig } from './expansionConfig'

export type StoredData = { localObjects: number; storedObjects: number }
export const emptyStoredData: StoredData = { localObjects: 0, storedObjects: 0 }
export type StorageMetrics = ReturnType<typeof advanceStorage>

export function calculateStorageCost(storageUsedGiB: number, requestsPerSecond: number) {
  return storageConfig.baseCostPerPeriod + Math.max(0, storageUsedGiB) * storageConfig.costPerGiB + Math.max(0, requestsPerSecond) * storageConfig.costPerRequestRate
}

/** Counts only: no files are uploaded. Connecting storage migrates existing local objects. */
export function advanceStorage(current: StoredData, uploadsPerSecond: number, connected: boolean, seconds = 1) {
  const uploads = Math.max(0, uploadsPerSecond) * Math.max(0, seconds)
  const localObjects = connected ? 0 : current.localObjects + uploads
  const storedObjects = current.storedObjects + (connected ? current.localObjects + uploads : 0)
  const storageUsedGiB = storedObjects * storageConfig.objectSizeGiB
  const localUsageGiB = localObjects * storageConfig.objectSizeGiB
  return { localObjects, storedObjects, storageUsedGiB, localUsageGiB, requestRate: Math.max(0, uploadsPerSecond), connected,
    localPressure: localUsageGiB / storageConfig.localCapacityGiB,
    latencyPenaltyMs: Math.round(Math.max(0, localUsageGiB / storageConfig.localCapacityGiB - 1) * storageConfig.localPressureLatencyMs),
    costPerPeriod: connected ? calculateStorageCost(storageUsedGiB, uploadsPerSecond) : 0 }
}
