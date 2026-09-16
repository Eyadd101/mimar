import { trafficSimulationConfig } from './config'

export type TrafficSimulationState = {
  activeUsers: number
  requestsPerSecond: number
  gameTimeSeconds: number
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

  return {
    activeUsers,
    requestsPerSecond: calculateRequestsPerSecond(activeUsers),
    gameTimeSeconds: 0,
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

  return {
    activeUsers,
    requestsPerSecond: calculateRequestsPerSecond(activeUsers),
    gameTimeSeconds,
  }
}
