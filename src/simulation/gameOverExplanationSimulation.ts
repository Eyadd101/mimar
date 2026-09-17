import type { GameOverReason } from './gameStateSimulation'
import type { StageStatistics } from './stageStatisticsSimulation'
import type { TrafficSimulationState } from './trafficSimulation'

export function createGameOverFailureChain(
  reason: GameOverReason,
  simulation: TrafficSimulationState,
  statistics: StageStatistics,
) {
  const trafficStep = `Traffic reached ${statistics.peakActiveUsers} active users.`

  if (reason.code === 'service-failure') {
    return [
      trafficStep,
      `Application latency reached ${simulation.applicationLatencyMs} ms.`,
      'Slow responses reduced customer satisfaction.',
      'Customer satisfaction remained at 0% beyond the recovery period.',
      'The service could no longer retain its customers.',
    ]
  }

  return [
    trafficStep,
    statistics.lowestSatisfaction < 100
      ? `Customer satisfaction fell as low as ${statistics.lowestSatisfaction.toFixed(1)}%.`
      : 'Customer satisfaction remained healthy, but available cash still ran out.',
    `Effective revenue was ${simulation.revenuePerPeriod.toFixed(1)} credits per period.`,
    `Infrastructure cost was ${simulation.infrastructureCostPerPeriod.toFixed(1)} credits per period.`,
    'The company balance reached 0 credits.',
  ]
}
