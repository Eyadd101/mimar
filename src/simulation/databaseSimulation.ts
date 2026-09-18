import { databaseConfig } from './expansionConfig'

export type DatabaseMetrics = ReturnType<typeof calculateDatabaseMetrics>

export function calculateDatabaseMetrics(requestsPerSecond: number, queriesPerRequest: number = databaseConfig.queriesPerRequest) {
  const queryLoad = Math.max(0, requestsPerSecond * queriesPerRequest)
  const capacity = databaseConfig.queryCapacity
  const activeConnections = Math.ceil(Math.max(0, requestsPerSecond) * databaseConfig.connectionsPerRequest)
  const utilization = Math.max(queryLoad / capacity, activeConnections / databaseConfig.connectionCapacity)
  // CPU tracks query work; memory combines a resident baseline and connections.
  const cpuUsage = Math.min(100, Math.max(0, queryLoad / capacity * 100))
  const memoryUsage = Math.min(100, databaseConfig.baselineMemory + databaseConfig.connectionMemory * Math.min(activeConnections / databaseConfig.connectionCapacity, 1) + databaseConfig.queryMemory * Math.min(queryLoad / capacity, 1))
  // Quadratic pressure near capacity, then a linear overload penalty.
  const queryLatencyMs = Math.round(databaseConfig.baseLatencyMs + databaseConfig.loadLatencyMs * Math.min(utilization, 1) ** 2 + databaseConfig.overloadLatencyMs * Math.max(0, utilization - 1))
  const status = utilization > 1 ? 'overloaded' : utilization >= .8 ? 'high' : utilization >= .6 ? 'elevated' : 'normal'
  return { queryLoad, capacity, activeConnections, connectionCapacity: databaseConfig.connectionCapacity, utilization, cpuUsage, memoryUsage, queryLatencyMs, status, costPerPeriod: databaseConfig.costPerPeriod } as const
}
