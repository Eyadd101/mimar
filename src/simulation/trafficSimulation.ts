import { trafficSimulationConfig } from './config'
import {
  calculateAppServerMetrics,
  type AppServerMetrics,
} from './appServerSimulation'

export type TrafficSimulationState = {
  activeUsers: number
  requestsPerSecond: number
  gameTimeSeconds: number
  appServer: AppServerMetrics
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

export function createInitialTrafficState(): TrafficSimulationState {
  const activeUsers = trafficSimulationConfig.initialActiveUsers
  const requestsPerSecond = calculateRequestsPerSecond(activeUsers)

  return {
    activeUsers,
    requestsPerSecond,
    gameTimeSeconds: 0,
    appServer: calculateAppServerMetrics(requestsPerSecond),
  }
}

export function advanceTrafficSimulation(
  currentState: TrafficSimulationState,
): TrafficSimulationState {
  const gameTimeSeconds =
    currentState.gameTimeSeconds + trafficSimulationConfig.tickIntervalMs / 1_000
  const completedGrowthIntervals = Math.floor(
    gameTimeSeconds / trafficSimulationConfig.activeUserGrowthIntervalSeconds,
  )
  const activeUsers =
    trafficSimulationConfig.initialActiveUsers +
    completedGrowthIntervals *
      trafficSimulationConfig.activeUsersAddedPerInterval
  const requestsPerSecond = calculateRequestsPerSecond(activeUsers)

  return {
    activeUsers,
    requestsPerSecond,
    gameTimeSeconds,
    appServer: calculateAppServerMetrics(requestsPerSecond),
  }
}
