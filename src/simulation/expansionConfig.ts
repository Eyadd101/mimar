/** All rates use game seconds; all operating costs use the existing 30s period. */
export const databaseConfig = {
  queriesPerRequest: 1,
  connectionsPerRequest: 2,
  baselineMemory: 25,
  connectionMemory: 45,
  queryMemory: 20,
  baseLatencyMs: 15,
  loadLatencyMs: 80,
  overloadLatencyMs: 700,
} as const

export const databaseTierConfigs = {
  small: { queryCapacity: 60, connectionCapacity: 80, memoryGiB: 2, costPerPeriod: 3 },
  medium: { queryCapacity: 180, connectionCapacity: 160, memoryGiB: 4, costPerPeriod: 12 },
} as const
export type DatabaseTierId = keyof typeof databaseTierConfigs
export const databaseUpgradeConfig = { deploymentCost: 90, deploymentDurationSeconds: 30 } as const

export const advancedResourceConfigs = {
  'object-storage': { name: 'Object Storage', labelKey: 'advanced.storage', purposeKey: 'advanced.storagePurpose', awsReference: 'S3', costPerPeriod: 1, deploymentCost: 30, deploymentDurationSeconds: 20, position: { x: 420, y: -320 } },
  queue: { name: 'Message Queue', labelKey: 'advanced.queue', purposeKey: 'advanced.queuePurpose', awsReference: 'SQS', costPerPeriod: 2, deploymentCost: 35, deploymentDurationSeconds: 20, position: { x: 720, y: 280 } },
  worker: { name: 'Worker', labelKey: 'advanced.worker', purposeKey: 'advanced.workerPurpose', awsReference: 'EC2', costPerPeriod: 5, deploymentCost: 45, deploymentDurationSeconds: 25, position: { x: 1020, y: 280 } },
  cache: { name: 'Cache', labelKey: 'advanced.cache', purposeKey: 'advanced.cachePurpose', awsReference: 'ElastiCache', costPerPeriod: 4, deploymentCost: 55, deploymentDurationSeconds: 25, position: { x: 720, y: -260 } },
} as const
export type AdvancedResourceType = keyof typeof advancedResourceConfigs
export const cacheConfig = { readFraction: .8, repeatReadFraction: .75, capacity: 220 } as const

export const queueConfig = { workerCapacity: 6, synchronousRequestEquivalentsPerJob: 6, healthyBacklogSeconds: 30 } as const

export const storageConfig = { objectSizeGiB: .005, localCapacityGiB: 1, localPressureLatencyMs: 500, baseCostPerPeriod: 1, costPerGiB: .15, costPerRequestRate: .1 } as const

export const securityConfig = { gracePeriodSeconds: 90, incidentCost: 40, incidentLatencyMs: 500 } as const

export const backupConfig = { frequenciesSeconds: [60, 120], baseCostPerPeriod: 3, restoreCost: 10, restoreDurationSeconds: 20, dataLossLatencyMs: 2000 } as const

export const reliabilityConfig = { unavailableLatencyMs: 2000 } as const

export const expansionEconomyConfig = { maximumRevenuePerPeriod: 110 } as const
export const databaseDownsizeConfig = { deploymentCost: 20, deploymentDurationSeconds: 20 } as const
export const resourcePlacementConfig = { minimumHorizontalGap: 300, minimumVerticalGap: 300, gridStep: 340 } as const
