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

export type TrafficAppServerResource = {
  id: string
  name: string
  tierId: ServerTierId
}

export type TrafficInfrastructure = {
  appServers: TrafficAppServerResource[]
  distributesTraffic: boolean
  loadBalancerCostPerPeriod: number
}

export type AppServerRuntimeMetrics = AppServerMetrics & {
  resourceId: string
  resourceName: string
  requestsPerSecond: number
}

export type TrafficSimulationState = CustomerSatisfactionState &
  EconomyState & {
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
  const trafficProfile = options.trafficProfile ?? trafficSimulationConfig
  const infrastructure = options.infrastructure ?? defaultInfrastructure
  const activeUsers = trafficProfile.initialActiveUsers
  const requestsPerSecond = calculateRequestsPerSecond(
    activeUsers,
    trafficProfile.requestsPerUserPerSecond,
  )
  const application = calculateApplicationMetrics(
    requestsPerSecond,
    infrastructure,
  )
  const satisfaction = createInitialCustomerSatisfactionState()

  return {
    activeUsers,
    requestsPerSecond,
    gameTimeSeconds: 0,
    ...application,
    serverDeployment: null,
    ...satisfaction,
    ...createInitialEconomyState(
      activeUsers,
      satisfaction.customerSatisfaction,
      application.infrastructureCostPerPeriod,
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
  return simulation.appServers.reduce((mostLoaded, server) =>
    server.utilizationRatio > mostLoaded.utilizationRatio
      ? server
      : mostLoaded,
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
  const application = calculateApplicationMetrics(
    requestsPerSecond,
    effectiveInfrastructure,
  )
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

  return {
    activeUsers,
    requestsPerSecond,
    gameTimeSeconds,
    ...application,
    serverDeployment: deploymentCompleted
      ? null
      : currentState.serverDeployment,
    ...satisfaction,
    ...economy,
  }
}

function calculateApplicationMetrics(
  requestsPerSecond: number,
  infrastructure: TrafficInfrastructure,
) {
  const shares =
    infrastructure.distributesTraffic && infrastructure.appServers.length > 1
      ? distributeRequestsEvenly(
          requestsPerSecond,
          infrastructure.appServers.length,
        )
      : infrastructure.appServers.map((_, index) =>
          index === 0 ? requestsPerSecond : 0,
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
  const applicationLatencyMs =
    requestsPerSecond > 0
      ? Math.round(weightedLatency / requestsPerSecond)
      : Math.round(
          appServers.reduce((total, server) => total + server.latencyMs, 0) /
            appServers.length,
        )
  const infrastructureCostPerPeriod = appServers.reduce(
    (total, server) => total + server.costPerPeriod,
    infrastructure.loadBalancerCostPerPeriod,
  )

  return {
    appServers,
    applicationLatencyMs,
    isServiceOverloaded: appServers.some((server) => server.isOverloaded),
    infrastructureCostPerPeriod,
  }
}
