import type { GameOverReason } from './gameStateSimulation'
import type { StageStatistics } from './stageStatisticsSimulation'
import { calculateAverageLatency } from './stageStatisticsSimulation'
import type { TrafficSimulationState } from './trafficSimulation'
import type { TranslationMessage } from '../i18n/translations'
import type { TranslationKey } from '../i18n/translations'
import { getCustomerSentiment } from './customerSentiment'

export function createGameOverFailureChain(
  reason: GameOverReason,
  simulation: TrafficSimulationState,
  statistics: StageStatistics,
): TranslationMessage[] {
  const cause: TranslationMessage | null = simulation.databaseData.dataLost ? { key: 'advanced.failureData' }
    : simulation.security.incidentActive ? { key: 'advanced.failureExposure' }
    : simulation.storage.localPressure > 1 ? { key: 'advanced.failureStorage' }
    : simulation.database.status === 'overloaded' ? { key: 'advanced.databaseHint' }
    : simulation.queue.oldestMessageAge > 30 ? { key: 'advanced.queueHint' } : null
  const trafficStep: TranslationMessage = {
    key: 'failure.traffic',
    variables: { users: statistics.peakActiveUsers },
  }

  if (reason.code === 'service-failure') {
    return [
      cause ?? trafficStep,
      {
        key: 'failure.serviceLatencyAverage',
        variables: { latency: calculateAverageLatency(statistics) },
      },
      { key: 'failure.slowResponses' },
      { key: 'failure.zeroSatisfaction' },
      { key: 'failure.lostCustomers' },
    ]
  }

  return [
    cause ?? trafficStep,
    statistics.lowestSatisfaction < 100
      ? {
          key: `failure.sentiment.${getCustomerSentiment(statistics.lowestSatisfaction).id}` as TranslationKey,
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
