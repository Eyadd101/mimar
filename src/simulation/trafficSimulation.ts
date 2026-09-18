import { getFailedResourceIds } from './reliabilitySimulation'
import { reliabilityConfig } from './expansionConfig'
import { advanceBackups, restoreDatabase, defaultBackupSettings, initialDatabaseData, getBackupCost, type BackupSettings, type DatabaseData } from './backupSimulation'
import { advanceSecurity, clearSecurityRuntime, secureSettings, type SecuritySettings, type SecurityRuntime } from './securitySimulation'
import { securityConfig, backupConfig } from './expansionConfig'
import { advanceStorage, emptyStoredData, type StoredData, type StorageMetrics } from './storageSimulation'
import { advanceQueue, emptyQueue, type QueueMetrics } from './queueSimulation'
import { queueConfig } from './expansionConfig'
import { calculateCacheMetrics, type CacheMetrics } from './cacheSimulation'
import { databaseConfig } from './expansionConfig'
import type { DatabaseTierId } from './expansionConfig'
import { calculateDatabaseMetrics, type DatabaseMetrics } from './databaseSimulation'
import type { StageTrafficProfile } from '../data/stages'
import {
  appServerResourceConfig,
  serverUpgradeConfig,
  trafficSimulationConfig,
  type ServerTierId,
} from './config'
import {
  calculateAppServerMetrics,
  type AppServerMetrics,
} from './appServerSimulation'
import {
  advanceCustomerSatisfaction,
  createInitialCustomerSatisfactionState,
  type CustomerSatisfactionState,
} from './customerSatisfactionSimulation'
import {
  advanceEconomy,
  canAffordCost,
  createInitialEconomyState,
  deductCost,
  type EconomyState,
} from './economySimulation'
import {
  advanceBusinessConsequences,
  createInitialBusinessConsequenceState,
  type BusinessConsequenceState,
} from './businessConsequenceSimulation'

export type TrafficAppServerResource = {
  id: string
  name: string
  tierId: ServerTierId
}

export type TrafficInfrastructure = {
  appServers: TrafficAppServerResource[]
  distributesTraffic: boolean
  databaseTierId?: DatabaseTierId
  backupSettings?: BackupSettings
  databaseData?: DatabaseData
  securitySettings?: SecuritySettings
  hasObjectStorage?: boolean
  storedData?: StoredData
  hasQueue?: boolean
  hasWorker?: boolean
  hasCache?: boolean
  advancedCostPerPeriod?: number
  hasDatabase?: boolean
  loadBalancerCostPerPeriod: number
}

export type AppServerRuntimeMetrics = AppServerMetrics & {
  resourceId: string
  resourceName: string
  isAvailable: boolean
  requestsPerSecond: number
}

export type TrafficSimulationState = CustomerSatisfactionState &
  BusinessConsequenceState &
  EconomyState & {
  databaseRestoreCompletesAt: number | null
  dataLossOccurred: boolean
  databaseData: DatabaseData
  security: SecurityRuntime
  storage: StorageMetrics
  queue: QueueMetrics
  cache: CacheMetrics
  database: DatabaseMetrics
  failedResourceIds: string[]
  activeUsers: number
  requestsPerSecond: number
  gameTimeSeconds: number
  appServers: AppServerRuntimeMetrics[]
  applicationLatencyMs: number
  isServiceOverloaded: boolean
  serverDeployment: ServerDeployment | null
}

export type ServerDeployment = {
  resourceId: string
  targetTierId: ServerTierId
  startedAtGameTimeSeconds: number
  completesAtGameTimeSeconds: number
  cost: number
}

type InitialTrafficStateOptions = {
  infrastructure?: TrafficInfrastructure
  balance?: number
  trafficProfile?: StageTrafficProfile
  serviceActive?: boolean
}

const defaultInfrastructure: TrafficInfrastructure = {
  appServers: [
    {
      id: 'server',
      name: appServerResourceConfig.name,
      tierId: appServerResourceConfig.initialTierId,
    },
  ],
  distributesTraffic: false,
  loadBalancerCostPerPeriod: 0,
}

const roundToOneDecimal = (value: number) => Math.round(value * 10) / 10

/**
 * Each active user generates the configured average requests per second.
 * requestsPerSecond = activeUsers * requestsPerUserPerSecond
 */
export function calculateRequestsPerSecond(
  activeUsers: number,
  requestsPerUserPerSecond: number =
    trafficSimulationConfig.requestsPerUserPerSecond,
) {
  return roundToOneDecimal(activeUsers * requestsPerUserPerSecond)
}

export function createInitialTrafficState(
  options: InitialTrafficStateOptions = {},
): TrafficSimulationState {
  const trafficProfile: StageTrafficProfile = options.trafficProfile ?? trafficSimulationConfig
  const infrastructure = options.infrastructure ?? defaultInfrastructure
  const activeUsers = options.serviceActive === false
    ? 0
    : trafficProfile.initialActiveUsers
  const requestsPerSecond = calculateRequestsPerSecond(
    activeUsers,
    trafficProfile.requestsPerUserPerSecond,
  )
  const application = calculateApplicationMetrics(
    requestsPerSecond,
    infrastructure,
    trafficProfile.queriesPerRequest,
  )
  const activeInfrastructureCost =
    options.serviceActive === false
      ? 0
      : application.infrastructureCostPerPeriod
  const satisfaction = createInitialCustomerSatisfactionState()
  const consequences = createInitialBusinessConsequenceState()

  return {
    activeUsers,
    requestsPerSecond,
    gameTimeSeconds: 0,
    ...application,
    databaseRestoreCompletesAt: null,
    dataLossOccurred: false,
    databaseData: infrastructure.databaseData ?? initialDatabaseData,
    security: advanceSecurity(clearSecurityRuntime, infrastructure.securitySettings ?? secureSettings, 0).state,
    storage: advanceStorage(infrastructure.storedData ?? emptyStoredData, 0, infrastructure.hasObjectStorage ?? false, 0),
    failedResourceIds: [],
    queue: emptyQueue,
    serverDeployment: null,
    ...satisfaction,
    ...consequences,
    ...createInitialEconomyState(
      activeUsers,
      satisfaction.customerSatisfaction,
      activeInfrastructureCost,
      options.balance,
    ),
  }
}

export function startServerUpgrade(
  currentState: TrafficSimulationState,
  resourceId: string,
): TrafficSimulationState {
  const appServer = currentState.appServers.find(
    (server) => server.resourceId === resourceId,
  )

  if (
    !appServer ||
    appServer.tierId === serverUpgradeConfig.targetTierId ||
    currentState.serverDeployment ||
    !canAffordCost(currentState.balance, serverUpgradeConfig.upgradeCost)
  ) {
    return currentState
  }

  return {
    ...currentState,
    balance: deductCost(
      currentState.balance,
      serverUpgradeConfig.upgradeCost,
    ),
    serverDeployment: {
      resourceId,
      targetTierId: serverUpgradeConfig.targetTierId,
      startedAtGameTimeSeconds: currentState.gameTimeSeconds,
      completesAtGameTimeSeconds:
        currentState.gameTimeSeconds +
        serverUpgradeConfig.deploymentDurationSeconds,
      cost: serverUpgradeConfig.upgradeCost,
    },
  }
}

export function calculateDeploymentProgress(
  deployment: ServerDeployment,
  gameTimeSeconds: number,
) {
  const deploymentDuration =
    deployment.completesAtGameTimeSeconds -
    deployment.startedAtGameTimeSeconds

  return Math.min(
    Math.max(
      (gameTimeSeconds - deployment.startedAtGameTimeSeconds) /
        deploymentDuration,
      0,
    ),
    1,
  )
}

export function advanceTrafficSimulation(
  currentState: TrafficSimulationState,
  elapsedGameSeconds = 1,
  trafficProfile: StageTrafficProfile = trafficSimulationConfig,
  trafficMultiplier = 1,
  infrastructure: TrafficInfrastructure = defaultInfrastructure,
): TrafficSimulationState {
  let simulation = currentState

  for (let elapsed = 0; elapsed < elapsedGameSeconds; elapsed += 1) {
    simulation = advanceOneGameSecond(
      simulation,
      trafficProfile,
      trafficMultiplier,
      infrastructure,
    )
  }

  return simulation
}

/** Even distribution in tenths keeps the shares bounded and the total exact. */
export function distributeRequestsEvenly(
  requestsPerSecond: number,
  serverCount: number,
) {
  if (serverCount <= 0) {
    return []
  }

  const requestTenths = Math.round(requestsPerSecond * 10)
  const baseShare = Math.floor(requestTenths / serverCount)
  const remainder = requestTenths % serverCount

  return Array.from(
    { length: serverCount },
    (_, index) => (baseShare + (index < remainder ? 1 : 0)) / 10,
  )
}

export function getMostLoadedAppServer(
  simulation: TrafficSimulationState,
) {
  return simulation.appServers.reduce<AppServerRuntimeMetrics | undefined>(
    (mostLoaded, server) =>
      !mostLoaded || server.utilizationRatio > mostLoaded.utilizationRatio
        ? server
        : mostLoaded,
    undefined,
  )
}

function advanceOneGameSecond(
  currentState: TrafficSimulationState,
  trafficProfile: StageTrafficProfile,
  trafficMultiplier: number,
  infrastructure: TrafficInfrastructure,
): TrafficSimulationState {
  const gameTimeSeconds = currentState.gameTimeSeconds + 1
  const completedGrowthIntervals = Math.floor(
    gameTimeSeconds / trafficProfile.activeUserGrowthIntervalSeconds,
  )
  const baselineActiveUsers =
    trafficProfile.initialActiveUsers +
    completedGrowthIntervals *
      trafficProfile.activeUsersAddedPerInterval
  const activeUsers = Math.round(baselineActiveUsers * trafficMultiplier)
  const requestsPerSecond = calculateRequestsPerSecond(
    activeUsers,
    trafficProfile.requestsPerUserPerSecond,
  )
  const deploymentCompleted =
    currentState.serverDeployment !== null &&
    gameTimeSeconds >= currentState.serverDeployment.completesAtGameTimeSeconds
  const effectiveInfrastructure = deploymentCompleted
    ? {
        ...infrastructure,
        appServers: infrastructure.appServers.map((server) =>
          server.id === currentState.serverDeployment?.resourceId
            ? {
                ...server,
                tierId: currentState.serverDeployment.targetTierId,
              }
            : server,
        ),
      }
    : infrastructure
  const failedResourceIds = getFailedResourceIds(trafficProfile.failures ?? [], gameTimeSeconds)
  const storage = advanceStorage(currentState.storage, requestsPerSecond * (trafficProfile.uploadsPerRequest ?? 0), infrastructure.hasObjectStorage ?? false)
  const application = calculateApplicationMetrics(
    requestsPerSecond,
    effectiveInfrastructure,
    trafficProfile.queriesPerRequest,
    requestsPerSecond * (trafficProfile.backgroundJobsPerRequest ?? 0),
    failedResourceIds,
  )
  const queue = advanceQueue(currentState.queue, requestsPerSecond * (trafficProfile.backgroundJobsPerRequest ?? 0), infrastructure.hasQueue ?? false, (infrastructure.hasQueue && infrastructure.hasWorker && !failedResourceIds.includes('worker')) ?? false)
  let databaseData = advanceBackups(currentState.databaseData, infrastructure.backupSettings ?? defaultBackupSettings)
  const dataLossOccurred = currentState.dataLossOccurred || (trafficProfile.dataLossAtSecond !== undefined && gameTimeSeconds >= trafficProfile.dataLossAtSecond)
  if (dataLossOccurred && !currentState.dataLossOccurred) databaseData = { ...databaseData, dataLost: true }
  const restoreCompleted = currentState.databaseRestoreCompletesAt !== null && gameTimeSeconds >= currentState.databaseRestoreCompletesAt
  if (restoreCompleted) databaseData = restoreDatabase(databaseData)
  if (databaseData.dataLost) application.applicationLatencyMs += backupConfig.dataLossLatencyMs
  const security = advanceSecurity(currentState.security, infrastructure.securitySettings ?? secureSettings)
  application.applicationLatencyMs += storage.latencyPenaltyMs + (security.state.incidentActive ? securityConfig.incidentLatencyMs : 0)
  application.infrastructureCostPerPeriod += storage.costPerPeriod + getBackupCost(infrastructure.backupSettings ?? defaultBackupSettings)
  const economyPeriodIsDue =
    gameTimeSeconds % appServerResourceConfig.costPeriodSeconds === 0
  const satisfaction = advanceCustomerSatisfaction(
    currentState,
    application.applicationLatencyMs,
    1,
  )
  const economy = advanceEconomy(
    currentState,
    activeUsers,
    satisfaction.customerSatisfaction,
    application.infrastructureCostPerPeriod,
    economyPeriodIsDue,
  )
  const consequences = advanceBusinessConsequences(
    currentState,
    application.applicationLatencyMs,
    economy.balance,
  )

  return {
    activeUsers,
    requestsPerSecond,
    gameTimeSeconds,
    ...application,
    failedResourceIds,
    queue,
    storage,
    security: security.state,
    databaseData,
    dataLossOccurred,
    databaseRestoreCompletesAt: restoreCompleted ? null : currentState.databaseRestoreCompletesAt,
    serverDeployment: deploymentCompleted
      ? null
      : currentState.serverDeployment,
    ...satisfaction,
    ...economy,
    balance: Math.max(0, consequences.balance - security.penalty),
    ...consequences.consequenceState,
  }
}

function calculateApplicationMetrics(
  requestsPerSecond: number,
  infrastructure: TrafficInfrastructure,
  queriesPerRequest?: number,
  backgroundJobs = 0,
  failedResourceIds: string[] = [],
) {
  const cache = calculateCacheMetrics(requestsPerSecond * (queriesPerRequest ?? databaseConfig.queriesPerRequest), infrastructure.hasCache ?? false)
  const database = calculateDatabaseMetrics(infrastructure.hasDatabase === false ? 0 : cache.databaseQueries, 1, infrastructure.databaseTierId)
  const effectiveRequests = requestsPerSecond + (infrastructure.hasQueue ? 0 : backgroundJobs * queueConfig.synchronousRequestEquivalentsPerJob)
  const availableServers = infrastructure.appServers.filter(resource => !failedResourceIds.includes(resource.id))
  const availableShares = infrastructure.distributesTraffic ? distributeRequestsEvenly(effectiveRequests, availableServers.length) : availableServers.map(resource => resource.id === infrastructure.appServers[0]?.id ? effectiveRequests : 0)
  const appServers = infrastructure.appServers.map(resource => {
    const index = availableServers.findIndex(server => server.id === resource.id)
    const requests = availableShares[index] ?? 0
    return { resourceId: resource.id, resourceName: resource.name, isAvailable: index >= 0,
      requestsPerSecond: requests, ...calculateAppServerMetrics(requests, resource.tierId) }
  })
  const weightedLatency = appServers.reduce(
    (total, server) =>
      total + server.latencyMs * server.requestsPerSecond,
    0,
  )
  const appLatencyMs =
    appServers.length === 0
      ? 0
      : requestsPerSecond > 0
        ? Math.round(weightedLatency / effectiveRequests)
        : Math.round(
            appServers.reduce((total, server) => total + server.latencyMs, 0) /
              appServers.length,
          )
  const infrastructureCostPerPeriod = appServers.reduce(
    (total, server) => total + server.costPerPeriod,
    (infrastructure.advancedCostPerPeriod ?? 0) + infrastructure.loadBalancerCostPerPeriod + (infrastructure.hasDatabase === false ? 0 : database.costPerPeriod),
  )

  return {
    appServers,
    database,
    cache,
    applicationLatencyMs: appLatencyMs + database.queryLatencyMs + (availableServers.length === 0 || (!infrastructure.distributesTraffic && failedResourceIds.includes(infrastructure.appServers[0]?.id)) || failedResourceIds.includes('database') ? reliabilityConfig.unavailableLatencyMs : 0),
    isServiceOverloaded: appServers.some((server) => server.isOverloaded) || database.status === 'overloaded',
    infrastructureCostPerPeriod,
  }
}
