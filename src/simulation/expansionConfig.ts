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

export const databaseTierConfigs = {
  small: { queryCapacity: 60, connectionCapacity: 80, memoryGiB: 2, costPerPeriod: 3 },
  medium: { queryCapacity: 180, connectionCapacity: 160, memoryGiB: 4, costPerPeriod: 12 },
} as const
export type DatabaseTierId = keyof typeof databaseTierConfigs
export const databaseUpgradeConfig = { deploymentCost: 90, deploymentDurationSeconds: 30 } as const

export const advancedResourceConfigs = {
  queue: { name: 'Message Queue', labelKey: 'advanced.queue', purposeKey: 'advanced.queuePurpose', awsReference: 'SQS', costPerPeriod: 2, deploymentCost: 35, deploymentDurationSeconds: 20, position: { x: 720, y: 280 } },
  worker: { name: 'Worker', labelKey: 'advanced.worker', purposeKey: 'advanced.workerPurpose', awsReference: 'EC2', costPerPeriod: 5, deploymentCost: 45, deploymentDurationSeconds: 25, position: { x: 1020, y: 280 } },
  cache: { name: 'Cache', labelKey: 'advanced.cache', purposeKey: 'advanced.cachePurpose', awsReference: 'ElastiCache', costPerPeriod: 4, deploymentCost: 55, deploymentDurationSeconds: 25, position: { x: 720, y: -260 } },
} as const
export type AdvancedResourceType = keyof typeof advancedResourceConfigs
export const cacheConfig = { readFraction: .8, repeatReadFraction: .75, capacity: 220 } as const

export const queueConfig = { workerCapacity: 6, synchronousRequestEquivalentsPerJob: 6, healthyBacklogSeconds: 30 } as const
