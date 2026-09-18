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
  requestsPerSecond: number
}

export type TrafficSimulationState = CustomerSatisfactionState &
  BusinessConsequenceState &
  EconomyState & {
  storage: StorageMetrics
  queue: QueueMetrics
  cache: CacheMetrics
  database: DatabaseMetrics
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
    storage: advanceStorage(infrastructure.storedData ?? emptyStoredData, 0, infrastructure.hasObjectStorage ?? false, 0),
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
  const storage = advanceStorage(currentState.storage, requestsPerSecond * (trafficProfile.uploadsPerRequest ?? 0), infrastructure.hasObjectStorage ?? false)
  const application = calculateApplicationMetrics(
    requestsPerSecond,
    effectiveInfrastructure,
    trafficProfile.queriesPerRequest,
    requestsPerSecond * (trafficProfile.backgroundJobsPerRequest ?? 0),
  )
  const queue = advanceQueue(currentState.queue, requestsPerSecond * (trafficProfile.backgroundJobsPerRequest ?? 0), infrastructure.hasQueue ?? false, (infrastructure.hasQueue && infrastructure.hasWorker) ?? false)
  application.applicationLatencyMs += storage.latencyPenaltyMs
  application.infrastructureCostPerPeriod += storage.costPerPeriod
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
    queue,
    storage,
    serverDeployment: deploymentCompleted
      ? null
      : currentState.serverDeployment,
    ...satisfaction,
    ...economy,
    balance: consequences.balance,
    ...consequences.consequenceState,
  }
}

function calculateApplicationMetrics(
  requestsPerSecond: number,
  infrastructure: TrafficInfrastructure,
  queriesPerRequest?: number,
  backgroundJobs = 0,
) {
  const cache = calculateCacheMetrics(requestsPerSecond * (queriesPerRequest ?? databaseConfig.queriesPerRequest), infrastructure.hasCache ?? false)
  const database = calculateDatabaseMetrics(infrastructure.hasDatabase === false ? 0 : cache.databaseQueries, 1, infrastructure.databaseTierId)
  const effectiveRequests = requestsPerSecond + (infrastructure.hasQueue ? 0 : backgroundJobs * queueConfig.synchronousRequestEquivalentsPerJob)
  const shares =
    infrastructure.distributesTraffic && infrastructure.appServers.length > 1
      ? distributeRequestsEvenly(
          effectiveRequests,
          infrastructure.appServers.length,
        )
      : infrastructure.appServers.map((_, index) =>
          index === 0 ? effectiveRequests : 0,
        )
  const appServers = infrastructure.appServers.map((resource, index) => ({
    resourceId: resource.id,
    resourceName: resource.name,
    requestsPerSecond: shares[index] ?? 0,
    ...calculateAppServerMetrics(shares[index] ?? 0, resource.tierId),
  }))
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
    applicationLatencyMs: appLatencyMs + database.queryLatencyMs,
    isServiceOverloaded: appServers.some((server) => server.isOverloaded) || database.status === 'overloaded',
    infrastructureCostPerPeriod,
  }
}
