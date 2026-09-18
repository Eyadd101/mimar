import type { GameOverReason } from './gameStateSimulation'
import type { StageStatistics } from './stageStatisticsSimulation'
import type { TrafficSimulationState } from './trafficSimulation'
import type { TranslationMessage } from '../i18n/translations'

export function createGameOverFailureChain(
  reason: GameOverReason,
  simulation: TrafficSimulationState,
  statistics: StageStatistics,
): TranslationMessage[] {
  const trafficStep: TranslationMessage = {
    key: 'failure.traffic',
    variables: { users: statistics.peakActiveUsers },
  }

  if (reason.code === 'service-failure') {
    return [
      trafficStep,
      {
        key: 'failure.serviceLatency',
        variables: { latency: simulation.applicationLatencyMs },
      },
      { key: 'failure.slowResponses' },
      { key: 'failure.zeroSatisfaction' },
      { key: 'failure.lostCustomers' },
    ]
  }

  return [
    trafficStep,
    statistics.lowestSatisfaction < 100
      ? {
          key: 'failure.lowSatisfaction',
          variables: {
            satisfaction: statistics.lowestSatisfaction.toFixed(1),
          },
        }
      : { key: 'failure.healthyCashOut' },
    {
      key: 'failure.revenue',
      variables: { revenue: simulation.revenuePerPeriod.toFixed(1) },
    },
    {
      key: 'failure.cost',
      variables: { cost: simulation.infrastructureCostPerPeriod.toFixed(1) },
    },
    { key: 'failure.zeroBalance' },
  ]
}
