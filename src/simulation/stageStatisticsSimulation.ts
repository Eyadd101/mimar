import { appServerResourceConfig } from './config'
import type { TrafficSimulationState } from './trafficSimulation'

export type StageStatistics = {
  peakActiveUsers: number
  cumulativeLatencyMs: number
  latencySampleCount: number
  lowestSatisfaction: number
  totalInfrastructureCost: number
}

export function createInitialStageStatistics(
  simulation: TrafficSimulationState,
): StageStatistics {
  return {
    peakActiveUsers: simulation.activeUsers,
    cumulativeLatencyMs: 0,
    latencySampleCount: 0,
    lowestSatisfaction: simulation.customerSatisfaction,
    totalInfrastructureCost: 0,
  }
}

export function advanceStageStatistics(
  current: StageStatistics,
  simulation: TrafficSimulationState,
): StageStatistics {
  const economyPeriodSettled =
    simulation.gameTimeSeconds % appServerResourceConfig.costPeriodSeconds === 0

  return {
    peakActiveUsers: Math.max(
      current.peakActiveUsers,
      simulation.activeUsers,
    ),
    cumulativeLatencyMs:
      current.cumulativeLatencyMs + simulation.applicationLatencyMs,
    latencySampleCount: current.latencySampleCount + 1,
    lowestSatisfaction: Math.min(
      current.lowestSatisfaction,
      simulation.customerSatisfaction,
    ),
    totalInfrastructureCost:
      current.totalInfrastructureCost +
      (economyPeriodSettled
        ? simulation.infrastructureCostPerPeriod
        : 0),
  }
}

export function calculateAverageLatency(statistics: StageStatistics) {
  return statistics.latencySampleCount === 0
    ? 0
    : Math.round(
        statistics.cumulativeLatencyMs / statistics.latencySampleCount,
      )
}
