/** All rates use game seconds; all operating costs use the existing 30s period. */
export const databaseConfig = {
  queriesPerRequest: 1,
  queryCapacity: 60,
  connectionCapacity: 80,
  connectionsPerRequest: 2,
  baselineMemory: 25,
  connectionMemory: 45,
  queryMemory: 20,
  baseLatencyMs: 15,
  loadLatencyMs: 80,
  overloadLatencyMs: 700,
  costPerPeriod: 3,
} as const
