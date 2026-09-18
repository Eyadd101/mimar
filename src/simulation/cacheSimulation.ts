import { cacheConfig } from './expansionConfig'

/** Only repeat reads are eligible. Writes and cache misses always reach the DB. */
export function calculateCacheMetrics(queryLoad: number, connected: boolean, readFraction: number = cacheConfig.readFraction) {
  const queries = Math.max(0, queryLoad)
  const readQueries = queries * Math.min(1, Math.max(0, readFraction))
  const requestsServed = connected ? Math.min(readQueries * cacheConfig.repeatReadFraction, cacheConfig.capacity) : 0
  return { hitRate: readQueries > 0 ? requestsServed / readQueries * 100 : 0,
    requestsServed, databaseQueries: Math.max(0, queries - requestsServed),
    capacity: cacheConfig.capacity, status: requestsServed >= cacheConfig.capacity ? 'high' : 'normal', connected } as const
}
export type CacheMetrics = ReturnType<typeof calculateCacheMetrics>
