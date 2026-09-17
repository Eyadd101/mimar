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

export type TrafficSimulationState = CustomerSatisfactionState &
  EconomyState & {
  activeUsers: number
  requestsPerSecond: number
  gameTimeSeconds: number
  appServer: AppServerMetrics
  serverDeployment: ServerDeployment | null
}

export type ServerDeployment = {
  targetTierId: ServerTierId
  startedAtGameTimeSeconds: number
  completesAtGameTimeSeconds: number
  cost: number
}

type InitialTrafficStateOptions = {
  tierId?: ServerTierId
  balance?: number
}

const roundToOneDecimal = (value: number) => Math.round(value * 10) / 10

/**
 * Each active user generates an average of 0.1 requests per second.
 * requestsPerSecond = activeUsers * requestsPerUserPerSecond
 */
export function calculateRequestsPerSecond(activeUsers: number) {
  return roundToOneDecimal(
    activeUsers * trafficSimulationConfig.requestsPerUserPerSecond,
  )
}

export function createInitialTrafficState(
  options: InitialTrafficStateOptions = {},
): TrafficSimulationState {
  const activeUsers = trafficSimulationConfig.initialActiveUsers
  const requestsPerSecond = calculateRequestsPerSecond(activeUsers)
  const tierId = options.tierId ?? appServerResourceConfig.initialTierId
  const appServer = calculateAppServerMetrics(requestsPerSecond, tierId)
  const satisfaction = createInitialCustomerSatisfactionState()

  return {
    activeUsers,
    requestsPerSecond,
    gameTimeSeconds: 0,
    appServer,
    serverDeployment: null,
    ...satisfaction,
    ...createInitialEconomyState(
      activeUsers,
      satisfaction.customerSatisfaction,
      appServer.costPerPeriod,
      options.balance,
    ),
  }
}

export function startServerUpgrade(
  currentState: TrafficSimulationState,
): TrafficSimulationState {
  if (
    currentState.appServer.tierId === serverUpgradeConfig.targetTierId ||
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
): TrafficSimulationState {
  let simulation = currentState

  for (let elapsed = 0; elapsed < elapsedGameSeconds; elapsed += 1) {
    simulation = advanceOneGameSecond(simulation)
  }

  return simulation
}

function advanceOneGameSecond(
  currentState: TrafficSimulationState,
): TrafficSimulationState {
  const gameTimeSeconds = currentState.gameTimeSeconds + 1
  const completedGrowthIntervals = Math.floor(
    gameTimeSeconds / trafficSimulationConfig.activeUserGrowthIntervalSeconds,
  )
  const activeUsers =
    trafficSimulationConfig.initialActiveUsers +
    completedGrowthIntervals *
      trafficSimulationConfig.activeUsersAddedPerInterval
  const requestsPerSecond = calculateRequestsPerSecond(activeUsers)
  const deploymentCompleted =
    currentState.serverDeployment !== null &&
    gameTimeSeconds >= currentState.serverDeployment.completesAtGameTimeSeconds
  const tierId = deploymentCompleted
    ? currentState.serverDeployment!.targetTierId
    : currentState.appServer.tierId
  const serverDeployment = deploymentCompleted
    ? null
    : currentState.serverDeployment
  const appServer = calculateAppServerMetrics(requestsPerSecond, tierId)
  const economyPeriodIsDue =
    gameTimeSeconds % appServerResourceConfig.costPeriodSeconds === 0
  const satisfaction = advanceCustomerSatisfaction(
    currentState,
    appServer.latencyMs,
    1,
  )
  const economy = advanceEconomy(
    currentState,
    activeUsers,
    satisfaction.customerSatisfaction,
    appServer.costPerPeriod,
    economyPeriodIsDue,
  )

  return {
    activeUsers,
    requestsPerSecond,
    gameTimeSeconds,
    appServer,
    serverDeployment,
    ...satisfaction,
    ...economy,
  }
}
